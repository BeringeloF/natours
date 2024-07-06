import Tour from '../models/tourModel.js';
import catchAsync from '../utils/catchAsync.js';
import { AppError } from '../utils/appError.js';
import * as factory from './handlerFactory.js';
import User from '../models/userModel.js';
import stripe from 'stripe';
import Booking from '../models/bookingModel.js';

const stripeObj = stripe(
  'sk_test_51PUTQJRuPziSA3wgpEMJoASfXqIcNVRhbGcJ4rZ3qALgbAD228CisgLfRdyZcCiHYaq9FVSnQWFVB1Dz6vrNtifk00iq5lroLk'
);

export const getCheckoutSession = catchAsync(async (req, res, next) => {
  //get currently booked tour

  const tour = await Tour.findById(req.params.tourId);

  tour.dates.forEach((doc) => {
    if (doc.participants >= tour.maxGroupSize) {
      doc.soldOut = true;
    }
  });

  await tour.save();

  if (tour.dates.every((doc) => doc.soldOut === true)) {
    return next(new AppError('All dates of this tour are reserved!', 401));
  }

  //create checkout-session
  const session = await stripeObj.checkout.sessions.create({
    payment_method_types: ['card'],
    success_url: `${req.protocol}://${req.get('host')}/my-tours`,
    cancel_url: `${req.protocol}://${req.get('host')}/${tour.slug}`,
    customer_email: req.user.email,
    client_reference_id: tour.id,
    line_items: [
      {
        price_data: {
          currency: 'usd',

          product_data: {
            name: `${tour.name} Tour`,
          },
          unit_amount: tour.price * 100,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
  });

  //create session as response
  res.status(200).json({
    status: 'success',
    session,
  });
});

// export const createBookingCheckout = catchAsync(async (req, res, next) => {
//   //this is only temporary, because it is unsecure and everyone can make bookings without paying
//   const { tour, user, price } = req.query;
//   if (!tour || !user || !price) return next();

//   await Booking.create({
//     tour,
//     user,
//     price,
//   });

//   const tourDoc = await Tour.findById(tour);

//   for (let i = 0; i < tourDoc.dates.length; i++) {
//     if (!tourDoc.dates[i].soldOut) {
//       tourDoc.dates[i].participants++;
//       await tourDoc.save();
//       break;
//     }
//   }
//   res.redirect(req.originalUrl.split('?')[0]);
// });

const createBookingCheckout = async (session) => {
  const tour = session.client_reference_id;
  const user = (await User.findOne({ email: session.customer_email }))._id;
  const price = session.line_items[0].price_data.unit_amount / 100;

  await Booking.create({
    tour,
    user,
    price,
  });

  const tourDoc = await Tour.findById(session.client_reference_id);

  for (let i = 0; i < tourDoc.dates.length; i++) {
    if (!tourDoc.dates[i].soldOut) {
      tourDoc.dates[i].participants++;
      await tourDoc.save();
      break;
    }
  }
};

export const webhookChechout = async (req, res, next) => {
  const signature = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    await createBookingCheckout(event.data.object);

    res.status(200).json({ received: true });
  }
};

export const getAllBookings = factory.getAll(Booking);

export const createBooking = factory.createOne(Booking);

export const getBooking = factory.getOne(Booking);

export const updateBooking = factory.updateOne(Booking);

export const deleteBooking = factory.deleteOne(Booking);
