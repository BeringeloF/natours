import express from 'express';

import * as authControler from '../controller/authControler.js';

export const router = express.Router();

router.post('/singup', authControler.singup);
router.post('/login', authControler.checkAttemptsLogin, authControler.login);
router.get('/logout', authControler.logout);

router.post('/forgotPassword', authControler.forgotPassword);
router.patch('/resetPassword/:token', authControler.resetPassword);

router.post('/verify-phone', authControler.protect, authControler.verifyPhone);
