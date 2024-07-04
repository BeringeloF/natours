import express from 'express';
import * as bookingControler from '../controller/bookingControler.js';
import * as authControler from '../controller/authControler.js';

//Isso ainda tem um problema que é que nos nao conseguimos acessar o parametro id
//Mas nos podemos resolvelo passando a opcao mergeParams: true

export const router = express.Router({ mergeParams: true });

router.use(authControler.protect);

router.get('/checkout-session/:tourId', bookingControler.getCheckoutSession);

router.use(authControler.restrictTo('admin', 'lead-guide'));

router
  .route('/')
  .get(bookingControler.getAllBookings)
  .post(bookingControler.createBooking);

router
  .route('/:id')
  .get(bookingControler.getBooking)
  .patch(bookingControler.updateBooking)
  .delete(bookingControler.deleteBooking);
