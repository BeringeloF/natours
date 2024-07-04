import catchAsync from '../utils/catchAsync.js';
import Booking from '../models/bookingModel.js';
import Review from '../models/reviewModel.js';
import * as factory from './handlerFactory.js';
import { AppError } from '../utils/appError.js';

export const getAllReviews = factory.getAll(Review);

export const setTourUserIds = (req, res, next) => {
  req.body.user = req.body.user || req.user._id;
  req.body.tour = req.body.tour || req.params.tourId;
  next();
};

export const getReview = factory.getOne(Review);
export const createReview = factory.createOne(Review);
export const deleteReview = factory.deleteOne(Review);
export const updateReview = factory.updateOne(Review);

export const isBooked = async (req, res, next) => {
  const maybeABookedTour = await Booking.find({
    tour: req.body.tour,
    user: req.body.user,
  });

  if (maybeABookedTour.length < 1)
    return next(
      new AppError('you must have booked a tour before giving it a review!')
    );

  next();
};
