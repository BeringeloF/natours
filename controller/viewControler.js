import Tour from '../models/tourModel.js';
import { AppError } from '../utils/appError.js';
import catchAsync from '../utils/catchAsync.js';
import User from '../models/userModel.js';
import Booking from '../models/bookingModel.js';

export const getOverview = catchAsync(async (req, res, next) => {
  //1. get tour data from collection
  const tours = await Tour.find();

  //2. build template

  //3. render that templete usiing tour data from step 1
  res.status(200).render('overview', {
    title: 'All tours',
    tours,
  });
});

export const getTour = catchAsync(async (req, res, next) => {
  //1 get the data for the requested tour
  const tour = await Tour.findOne({ slug: req.params.tourSlug }).populate({
    path: 'reviews',
    select: 'rating review user',
  });

  const hasAnyBooking = await Booking.findOne({
    tour: tour._id,
    user: res.locals.user?._id,
  });

  if (!tour) return next(new AppError('There is no tour with that name!', 404));

  //build the template

  //Render template using data from 1)
  res.status(200).render('tour', {
    title: tour.name + ' Tour',
    tour,
    hasAnyBooking,
  });
});

export const getVerifyPhoneForm = (req, res, next) => {
  res.status(200).render('verifyNumber', {
    title: 'Verify your phone number',
  });
};

export const getloginForm = function (req, res, next) {
  //build template

  //render template
  res.status(200).render('login', {
    title: 'Log into your account',
  });
};

export const getAccount = (req, res, next) => {
  res.status(200).render('account', {
    title: 'Your account',
  });
};

export const getConfirmEmailWindow = catchAsync(async (req, res, next) => {
  if (req.user.userConfirmEmail) {
    res.redirect(req.originalUrl.split('/')[0]);
  } else {
    res.render('confirmEmail', {
      title: 'Confirm your email',
    });
  }
});

export const updateUserData = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      name: req.body.name,
      email: req.body.email,
    },
    { new: true, runValidators: true }
  );

  res.status(200).render('account', {
    title: 'Your account',
    user,
  });
});

export const getSingUpForm = (req, res, next) => {
  res.render('singUp', {
    title: 'Sing Up',
  });
};

export const getConfirmPhoneWindow = (req, res, next) => {
  if (req.user.userConfirmPhone) {
    res.redirect(req.originalUrl.split('/')[0]);
  } else {
    res.render('confirmPhone', {
      title: 'Confirm your phone number',
    });
  }
};

export const getMyTours = catchAsync(async (req, res, next) => {
  //find all bookings

  const bookings = await Booking.find({ user: req.user.id });

  //find tours with the returned IDs
  const tourIds = bookings.map((el) => el.tour);
  //Este operador $in serve para selecionar todos os documentos em que os id esta dentro de tourIds array
  const tours = await Tour.find({ _id: { $in: tourIds } });

  res.status(200).render('overview', {
    title: 'My tours',
    tours,
  });
});

export const alerts = (req, res, next) => {
  const { alert } = req.query;

  if (alert === 'booking')
    res.locals.alert =
      'Your booking was successful! Please check your email for a confirmation. If your booking does not show up here imediatly, plese come back later.';

  next();
};
