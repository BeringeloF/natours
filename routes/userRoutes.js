import express from 'express';
import * as userControler from '../controller/userControler.js';
import * as authControler from '../controller/authControler.js';
import { router as bookingRouter } from './bookingRoutes.js';
export const router = express.Router();

router.use('/:userId/bookings', bookingRouter);

// router.get('/refresh-token', authControler.updateAccessToken);

//Todos o request apartir daqui devem ser protect entao como router tambem é um middleware nos podemos usar o .use para
//correr o protect sempre apartir deste ponto antes

router.use(authControler.protect);

router.patch(
  '/updateMyPassword',
  authControler.emailMaybeWasConfirmed,

  authControler.updatePassword
);

router.patch(
  '/updateMe',
  authControler.emailMaybeWasConfirmed,
  userControler.uploadUserPhoto,
  userControler.resizeUserPhoto,
  userControler.updateMe
);

router.patch('/updatePhone', userControler.updatePhone);

router.get(
  '/me',
  authControler.emailMaybeWasConfirmed,
  userControler.getMe,
  userControler.getUser
);

//como todos estes routes apartir daqui devem apenas ser executados por admins no podemos usar isso

// router.use(authControler.restrictTo('admin'));
router.delete('/deleteMe', userControler.deleteMe);

router.route('/').get(userControler.getAllUsers).post(userControler.createUser);

router
  .route('/:id')
  .get(userControler.getUser)
  .patch(userControler.updateUser)
  .delete(userControler.deleteUser);
