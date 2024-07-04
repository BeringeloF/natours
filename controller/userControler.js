import catchAsync from '../utils/catchAsync.js';
import User from '../models/userModel.js';
import { AppError } from '../utils/appError.js';
import * as factory from './handlerFactory.js';
import multer from 'multer';
import sharp from 'sharp';
import { sendSMS } from '../utils/sms.js';

//Para podermos realmente  salvar a imagem no computador usamos o diskStorage
//como argumento o diskStorage recebe um objeto de opcoes, nele nos temos que definir o destination que é uma  function que recebe
//como passa como parametro o req, file , cb uma callback function
// const multerStorage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     //Aqui no cb nos passamos como primerio argumento o erro, caso nao tenha null, como segundo a real destination
//     cb(null, 'public/img/users');
//   },

//   filename: (req, file, cb) => {
//     //Aqui nos iremos definir o nome do aquivo, ele dever vir neste formato: user_ID_DO_USER-TIMESTAMP   isso para garantir o que
//     //uma foto nao vai ser atribuida a user diferente  e tambem para poder diferenciar as fotos
//     //este ext é a file extencion ex: jpeg, png, gif, etc...

//     const ext = file.mimetype.split('/')[1];
//     cb(null, `user-${req.user._id}-${Date.now()}.${ext}`);
//   },
// });

//Agora para salvar apenas na memoria com um buffer nos fazer assim
//Entao a imagem estara salva em req.file.buffer
const multerStorage = multer.memoryStorage();

//Este filtro serve pra garantir que os unicos files que estao sendo carregados sao imagens
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image!, please upload only images', 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

export const uploadUserPhoto = upload.single('photo');

//Agora nos iremos processar o foto para deixa-la no formato em que queremos, neste caso um quadrado, para isso nos usares o sharp
export const resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next();
  req.file.filename = `user-${req.user._id}-${Date.now()}.jpeg`;
  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg') //Serve para converter a imagem para um tipo especifico
    .jpeg({ quality: 90 }) //disponivel para imagens jpeg, aceita um objeto de opcoes entre elas quality que serve para especificar a qualidade da imagem
    .toFile(`public/img/users/${req.file.filename}`); //Serve para  salvar o imagem processada no destino que especificarmos

  next();
});

const filterdObj = function (obj, ...allowF) {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowF.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};
export const getAllUsers = factory.getAll(User);

export const updateMe = catchAsync(async function (req, res, next) {
  //Create Error if user try to post password data

  if (req.body.password || req.body.passwordConfirm)
    return next(
      new AppError(
        'This route is not for password update! Please use /updateMyPassword',
        400
      )
    );

  //filter out unwanted fields name that are not allowed to be updated
  const filterdBody = filterdObj(req.body, 'name', 'email');

  if (req.file) filterdBody.photo = req.file.filename;

  //Update user document
  const updatedUser = await User.findByIdAndUpdate(req.user._id, filterdBody, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: 'success',
    user: updatedUser,
  });
});

export const updatePhone = async (req, res, next) => {
  const phone = req.body.phone;

  const user = await User.findById(req.user._id);
  user.phone = phone;
  const updatedUser = await user.save({ validateBeforeSave: false });
  await sendSMS(updatedUser);
  res.status(200).json({
    status: 'success',
    message: 'verification code sent to your phone',
  });
};

export const getMe = async (req, res, next) => {
  req.params.id = req.user._id;
  next();
};

export const deleteMe = async (req, res, next) => {
  await User.findByIdAndUpdate(req.user._id, { active: false });

  res.status(204).json({
    status: 'success',
    data: null,
  });
};

export const createUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'this route is not defined, please use /singup insted!',
  });
};

//Do not update password with this
export const updateUser = factory.updateOne(User);

export const getUser = factory.getOne(User);

export const deleteUser = factory.deleteOne(User);
