import express from 'express';
import * as reviewControler from '../controller/reviewControler.js';
import * as authControler from '../controller/authControler.js';

//Isso ainda tem um problema que é que nos nao conseguimos acessar o parametro id
//Mas nos podemos resolvelo passando a opcao mergeParams: true
export const router = express.Router({ mergeParams: true });

router.use(authControler.protect);
router
  .route('/')
  .get(reviewControler.getAllReviews)
  .post(
    authControler.restrictTo('user'),
    reviewControler.setTourUserIds,
    reviewControler.isBooked,
    reviewControler.createReview
  );

router
  .route('/:id')
  .get(reviewControler.getReview)
  .delete(
    authControler.restrictTo('user', 'admin'),
    reviewControler.deleteReview
  )
  .patch(
    authControler.restrictTo('user', 'admin'),
    reviewControler.updateReview
  );
