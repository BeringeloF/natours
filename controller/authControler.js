import { promisify } from 'util';
import User from '../models/userModel.js';
import catchAsync from '../utils/catchAsync.js';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/appError.js';
import crypto from 'crypto';
import obj from '../count.js';
import { Email } from '../utils/email.js';
import { sendSMS } from '../utils/sms.js';

const verifyAndCreateToken = async (token, secret, res) => {
  try {
    const decodeRefreshToken = await promisify(jwt.verify)(token, secret);

    if (!decodeRefreshToken) throw new AppError('invalid refresh token', 400);

    const user = await User.findById(decodeRefreshToken.id);
    if (!user)
      throw new AppError(
        'the user belonging to this token no loger exists!',
        404
      );

    await generateRefreshToken(user, res);
    createSendToken(user, 200, res, true);
  } catch (err) {
    throw err;
  }
};

const checkUserChangePassword = async (token, secret) => {
  try {
    const decodeRefreshToken = await promisify(jwt.verify)(token, secret);

    if (!decodeRefreshToken) throw new AppError('invalid refresh token', 400);

    const user = await User.findById(decodeRefreshToken.id);
    if (!user)
      throw new AppError(
        'the user belonging to this token no loger exists!',
        404
      );

    if (user.changedPasswordAfter(decodeRefreshToken.iat)) return true;
  } catch (err) {
    throw err;
  }
};

const generateRefreshToken = async (user, res) => {
  const refresh = singToken(user._id, true);

  const cookieOptions = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    secure: true,
    httpOnly: true,
  };

  // if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;
  res.cookie('refresh', refresh, cookieOptions);
};

export const emailMaybeWasConfirmed = async (req, res, next) => {
  const user = await User.findOne({ _id: req.user._id })
    .select('+userConfirmEmail')
    .select('+userConfirmPhone');

  if (!user.userConfirmEmail || !user.userConfirmPhone)
    return next(
      new AppError(
        'You need to confirm your email and phone number before access this part of the web site',
        401
      )
    );

  next();
};

const singToken = (id, refresh = false) => {
  if (!refresh) {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
      //Esta opcao serve para dizer por quanto tempo o token sera valido, ou seja assim que acabar a validade o user sera logout
      expiresIn: process.env.JWT_EXPIRES_IN,
    });
  }

  return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: '7d',
  });
};

const createSendToken = function (user, statusCode, res, boolean = false) {
  const token = singToken(user._id);

  //Aqui nos iremos implementar cookies, eles sao texto que nos envimos com alguma informaçao sensivel que apenas o navegador pode acessar e nao pode ser modificado
  //Ex nosso json web token

  const cookieOptions = {
    expires: new Date(
      Date.now() + Number(process.env.JWT_COOKIES_EXPIRES_IN) * 60 * 1000
    ),
    secure: true,
    httpOnly: true,
  };

  // if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;
  res.cookie('jwt', token, cookieOptions);

  user.password = undefined;

  if (!boolean) {
    res.status(statusCode).json({
      status: 'success',
      token,
      data: {
        user,
      },
    });
  }
};
export const singup = catchAsync(async function (req, res, next) {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    photo: req.body.photo,
    phone: req.body.phone,
  });

  const emailToken = newUser.createEmailToken();

  await newUser.save({ validateBeforeSave: false });

  const url = `${req.protocol}://${req.get('host')}/confirmEmail/${emailToken}`;

  //Aqui nos iremos implementar autentication para permitir que os usarios acessem nosso aplicativo
  //Nos irmeos usar o jsonwebtoken para implementar isso

  //Aqui nos usamos o metodo sing para gerar um token de acesso para o usuario, ele recebe com primeiro argumento o payload
  //Que é o dado que sera armazenado no token, e como segundo argumento ele recebe secretKey
  //o secret key deve ser no minimo 32 caracters long e ela deve ser unica
  //ele aceita com terceiro argumento um objeto de opcoes

  await new Email(newUser, url).sendConfirmEmail();

  await generateRefreshToken(newUser, res);
  createSendToken(newUser, 201, res);
});

export const confirmEmail = catchAsync(async (req, res, next) => {
  const emailToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    confirmEmailToken: emailToken,
    emailTokenExpires: { $gt: Date.now() },
  }).select('+userConfirmEmail');

  if (!user)
    return next(new AppError('Token is invalid or has alredy expired!', 400));

  user.confirmEmailToken = undefined;
  user.emailTokenExpires = undefined;
  user.userConfirmEmail = true;

  await user.save({ validateBeforeSave: false });
  await sendSMS(user);

  const url = `${req.protocol}://${req.get('host')}/confirmPhoneNumber`;

  res.redirect(url);
});

export const verifyPhone = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ _id: req.user._id }).select(
    '+userConfirmPhone'
  );

  if (!user.phone)
    return next(new AppError('you shoul send your phone number first!'));

  if (user.verificationCodeExpires < Date.now())
    return next(new AppError('verification code expired!', 400));

  if (!(user.phoneVerificationCode === req.body.code))
    return next(new AppError('invalid code!', 400));

  user.userConfirmPhone = true;
  user.verificationCodeExpires = undefined;

  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    message: 'Phone number verified',
  });
});

export const login = catchAsync(async function (req, res, next) {
  const { email, password } = req.body;
  //check if email and password exist
  if (!email || !password) {
    return next(new AppError('please provid an email and password', 400));
  }

  //check if the user exist && password is correct

  //quando queremos pegar um field em que o select é false nos usamos o .select('+nameofthefield')
  //lembrando que select ser false quer dizer que ele nao sera mostrado no output quando for feita uma requisiçao
  const user = await User.findOne({ email: email }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password))) {
    const ip = req.ip || req.connetion.remoteAddress;
    updateLoginAttempts(ip);
    return next(new AppError('incorrect email or password', 401));
  }

  //if everything is okay send token to client

  await generateRefreshToken(user, res);
  createSendToken(user, 200, res);
});

export const logout = (req, res, next) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 1500),
    httpOnly: true,
  });

  res.cookie('refresh', 'loggedout', {
    expires: new Date(Date.now() + 1500),
    httpOnly: true,
  });

  res.status(200).json({
    status: 'success',
  });
};

export const checkAttemptsLogin = (req, res, next) => {
  const ip = req.ip || req.connetion.remoteAddress;
  // console.log(ip);
  if (obj[ip]?.hour && obj[ip].hour < Date.now()) {
    obj[ip].count = 0;
    obj[ip].hour = 0;
  }
  console.log(obj[ip]);
  if (obj[ip]?.count > 3) {
    obj[ip].hour = Date.now() + 1000 * 16;
    return next(
      new AppError(
        'Max number of log in attempts reached, wait 1 hour and again!',
        401
      )
    );
  }

  next();
};

const updateLoginAttempts = (ipAddress) => {
  // if (ipAddress === '127.0.0.1') return;

  // console.log(obj[ipAddress]);
  if (obj[ipAddress]) {
    ++obj[ipAddress].count;

    return;
  }
  obj[ipAddress] = { count: 1, hour: 0 };
};

//Essa funcao ira proteger o acesso a certas routes
//Para isso nos vemos o header autorization onde nos enviamos o token
//Ou os cookies
export const protect = catchAsync(async function (req, res, next) {
  let token;
  //getting token and cheking if it's there
  // if (
  //   req.headers.authorization &&
  //   req.headers.authorization.startsWith('Bearer')
  // ) {
  //   token = req.headers.authorization.split(' ')[1];
  // } else
  const tokenRefresh = req.cookies.refresh;

  if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!tokenRefresh)
    return next(
      new AppError('you are not logged in! Please log in to get access!', 401)
    );

  const userChangePassword = await checkUserChangePassword(
    tokenRefresh,
    process.env.JWT_REFRESH_SECRET
  );

  if (userChangePassword)
    return next(
      new AppError('User recently chanded password!, please log in again', 401)
    );

  if (!token) {
    await verifyAndCreateToken(
      tokenRefresh,
      process.env.JWT_REFRESH_SECRET,
      res
    );
  }

  token = req.cookies.jwt;

  //verification token
  //Aqui nos iremos verificar se o token e valido usando o verify que aceita como primeiro argumento o token e segundo o secret
  //E como terceiro argumento uma callback function que é executada assim que sua acao for finalizada ou seja este verify é um aync method
  //como nos estamos usando async await nos podemos promissify este metodo
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  //check if the user still exist
  const currentUser = await User.findById({ _id: decoded.id })
    .select('+userConfirmEmail')
    .select('+userConfirmPhone');
  if (!currentUser)
    return next(
      new AppError('the user belonging to this token no loger exist', 401)
    );

  //cheke if the user change password after the token was issued
  //Aqui nos checamos se o usuario mudou a senha depois do toker ter sido emitido, neste caso
  // nos nao quermos liberar o accesso a  este usuario
  //no fazemos isso usando o instace metodo que nos criamos e passomos nele o timestamp de quando o token foi criado

  if (currentUser.changedPasswordAfter(decoded.iat))
    return next(
      new AppError('User recently chanded password!, please log in again', 401)
    );

  //granted access to the protected route
  //caso tenha checado ate sem erro significa que podemos liberar o acesso ao user
  req.user = currentUser;
  res.locals.user = currentUser;
  next();
});

export const restrictTo = (...roles) => {
  return function (req, res, next) {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action!', 403)
      );
    }
    next();
  };
};

//Aqui nos iremos implementar a funcionalidade de mudar senha

export const forgotPassword = catchAsync(async (req, res, next) => {
  //get user based on posted email
  const user = await User.findOne({ email: req.body.email });

  if (!user)
    return next(new AppError('There is no user with that email address', 404));

  //generate ramdom token
  const resetToken = user.createPasswordResetToken();
  //nos precisamos passar esta opcao para funcionar
  //Pois nos colocamos no shema para os validator funcionarem ao salva
  //e se eles funcionarem teriamos erros ex: password confirm
  await user.save({ validateBeforeSave: false });
  //send it to user email

  try {
    const resetURL = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/auth/resetPassword/${resetToken}`;

    await new Email(user, resetURL).sendPasswordReset();

    res.status(200).json({
      status: 'success',
      message: 'token sent to email!',
    });
  } catch (err) {
    console.log(err);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError('there was an error sending the email. Try again later', 500)
    );
  }
});

export const resetPassword = catchAsync(async (req, res, next) => {
  //get user based on token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  //if token has not expired, and there is user, set the new password

  if (!user)
    return next(new AppError('Token is invalid or has alredy expired!', 400));

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  //update changedPassword property for the current user

  await user.save();

  //Log the user in
  res.status(200).json({
    status: 'success',
    message: 'password successfuly changed!',
  });
});

export const updatePassword = catchAsync(async (req, res, next) => {
  //get the user from the collection

  const user = await User.findById(req.user._id).select('+password');

  //check if the posted password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password)))
    return next(new AppError('Your passwod is wrong!', 401));
  //if so, update  the password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();

  //log the user in, send the jwt
  createSendToken(user, 200, res);
});

//Only for rendered pages, no erros will occur here
export const isLoggedIn = async function (req, res, next) {
  if (req.cookies.jwt) {
    //verification token
    //Aqui nos iremos verificar se o token e valido usando o verify que aceita como primeiro argumento o token e segundo o secret
    //E como terceiro argumento uma callback function que é executada assim que sua acao for finalizada ou seja este verify é um aync method
    //como nos estamos usando async await nos podemos promissify este metodo
    try {
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );

      //check if the user still exist
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) return next();

      // const userChangePassword = await verifyAndCreateToken(
      //   req.cookies.refresh,
      //   process.env.JWT_REFRESH_SECRET,
      //   res
      // );

      // if(userChangePassword)

      //cheke if the user change password after the token was issued
      //Aqui nos checamos se o usuario mudou a senha depois do toker ter sido emitido, neste caso
      // nos nao quermos liberar o accesso a  este usuario
      //no fazemos isso usando o instace metodo que nos criamos e passomos nele o timestamp de quando o token foi criado

      if (currentUser.changedPasswordAfter(decoded.iat)) return next();

      //granted access to the protected route
      //caso tenha checado ate sem erro significa que podemos liberar o acesso ao user
      //There is a logged in user
      //nos usamos req.locals.user para ter  acesso ao user em nossos templates
      res.locals.user = currentUser;

      return next();
    } catch (err) {
      return next();
    }
  }

  const tokenRefresh = req.cookies.refresh;

  if (!tokenRefresh) return next();

  try {
    if (
      await checkUserChangePassword(
        tokenRefresh,
        process.env.JWT_REFRESH_SECRET
      )
    ) {
      return next();
    }

    await verifyAndCreateToken(
      tokenRefresh,
      process.env.JWT_REFRESH_SECRET,
      res
    );

    if (req.method === 'GET') {
      res.redirect(req.originalUrl.split('?')[0]);
    } else {
      return next();
    }
  } catch (err) {
    return next();
  }
};
