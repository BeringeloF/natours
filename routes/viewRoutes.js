import express from 'express';
import * as viewControler from '../controller/viewControler.js';
import * as authControler from '../controller/authControler.js';

export const router = express.Router();

router.use(viewControler.alerts);

router.get(
  '/',
  // createBookingCheckout,
  authControler.isLoggedIn,
  viewControler.getOverview
);

router.get(`/tour/:tourSlug`, authControler.isLoggedIn, viewControler.getTour);

router.get('/verify-phone-number', viewControler.getVerifyPhoneForm);

router.get('/singup', viewControler.getSingUpForm);

router.get('/login', authControler.isLoggedIn, viewControler.getloginForm);

router.get(
  '/confirmEmail',
  authControler.protect,
  viewControler.getConfirmEmailWindow
);

router.get(
  '/confirmPhoneNumber',
  authControler.protect,
  viewControler.getConfirmPhoneWindow
);

router.get('/confirmEmail/:token', authControler.confirmEmail);

router.get(
  '/me',
  authControler.protect,
  authControler.emailMaybeWasConfirmed,
  viewControler.getAccount
);

router.get(
  '/my-tours',
  authControler.protect,
  authControler.emailMaybeWasConfirmed,
  viewControler.getMyTours
);

router.post(
  '/submit-user-data',
  authControler.protect,
  viewControler.updateUserData
);
