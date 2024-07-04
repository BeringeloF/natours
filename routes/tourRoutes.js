import express from 'express';
import * as tourControler from '../controller/tourControler.js';
import * as authControler from '../controller/authControler.js';
// import * as reviewControler from '../controller/reviewControler.js';
import { router as reviewRouter } from './reviewRoutes.js';
import { router as bookingRouter } from './bookingRoutes.js';

export const router = express.Router();

//Agora nos iremos trabalhar com nested routes
//Por exemplo para se quisermos acessar as reviews de um certo tour nos temos que usar o tour resourse mais o review resourse
//e passarmos o id do tour para pegar as reviews dele
//Post tour/1u2y38y0r437434013hy/reviews
//Get tour/1u2y38y0r437434013hy/reviews

//e caso queramos uma review em especifaca nos tambem passamos o id da review
//Get tour/1u2y38y0r437434013hy/reviews/893jhw1325ud87237yehd

// router
//   .route('/:tourId/reviews')
//   .post(
//     authControler.protect,
//     authControler.restrictTo('user'),
//     reviewControler.createReview
//   );

//para implementar isso nos fazemos
// Aqui nos estamos dizendo que caso encontre este route usar o reviewRouter
//entao o que fizemos aqui foi outro mounting
router.use('/:tourId/reviews', reviewRouter);
router.use('/:tourId/bookings', bookingRouter);

//esse router so funciona quando o id esta presente na url
//e nele nos temos acesso a um quarto paremetro que e o valor em questao do id neste caso
//Com este middle ware nos nao precisamos mais validar o id em route
// router.param("id", tourControler.checkId);
//como nos ja especificamos no app o routing nos podemos apenas usar '/' para se referir a ele
//Nos tambem podemos passar outras funcoes dentro do metodos
//Ex se nos quisermos checar um post antes de realmete envialo ao data base
//Nos fazemos isto passando uma funcao que  vai ser acionada antes do funcao de criar/enviar tour

router.route('/tour-stats').get(tourControler.getTourStats);
router.route('/monthly-plan/:year').get(tourControler.getMonthlyPlan);

router
  .route('/top-5-cheap')
  .get(tourControler.aliasTopTour, tourControler.getAllTours);

//Aqui nos usaremos geospatial query
//essa route serve para achar tour que estao ate a distacia espeficade de longe, com o centro cendo a localizao do user
// em latlng e unit sendo a unidade de medida utilizada
//a url ficaria assim: /tour-within/200/center/42,49/unit/km
router
  .route('/tour-within/:distance/center/:latlng/unit/:unit')
  .get(tourControler.getTourWithin);

router.route('/distances/:latlng/unit/:unit').get(tourControler.getDistances);
router
  .route('/')
  .get(tourControler.getAllTours)
  .post(
    authControler.protect,
    authControler.restrictTo('admin', 'lead-guide'),
    tourControler.createTour
  );

router
  .route('/:id')
  .get(tourControler.getTour)
  .patch(
    authControler.protect,
    authControler.restrictTo('admin', 'lead-guide'),
    tourControler.uploadTourImages,
    tourControler.resizeTourImages,
    tourControler.updateTour
  )
  .delete(
    authControler.protect,
    authControler.restrictTo('admin', 'lead-guide'),
    tourControler.deleteTour
  );
