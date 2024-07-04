import Tour from '../models/tourModel.js';
import { APIFeatures } from '../utils/APIFeatures.js';
import catchAsync from '../utils/catchAsync.js';
import { AppError } from '../utils/appError.js';
import * as factory from './handlerFactory.js';
import multer from 'multer';
import sharp from 'sharp';

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

//nos usamos isso pois nos queremos fazer o upload de mutiplos images em diferentes field, Mas caso tivissemos apenas um field que aceita multiplas images
//nos poderiamos ter feito isto: upload.array('images', 3) 3 é o maxcount
export const uploadTourImages = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 3 },
]);

export const resizeTourImages = catchAsync(async (req, res, next) => {
  if (!req.files.imageCover || !req.files.images) return next();
  // 1 cover image
  req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;
  await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333)
    .toFormat('jpeg') //Serve para converter a imagem para um tipo especifico
    .jpeg({ quality: 90 }) //disponivel para imagens jpeg, aceita um objeto de opcoes entre elas quality que serve para especificar a qualidade da imagem
    .toFile(`public/img/tours/${req.body.imageCover}`); //Serve para  salvar o imagem processada no destino que especificarmos

  req.body.images = [];
  //Aqui nos usamos promise.all e map ao invez de forEach, pois caso contrario isto nao funcionaria
  //Pois o codigo mesmo tendo marcado a callback function dentro do forEach como async o proprio forEach nao é async entao o codigo ira para next
  //Para resolver isso nos tivemos que mudar para o map e coloca-lo dentro de um promise.all para podermos enfim usar um await
  await Promise.all(
    req.files.images.map(async (file, i) => {
      const filename = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;
      await sharp(file.buffer)
        .resize(2000, 1333)
        .toFormat('jpeg') //Serve para converter a imagem para um tipo especifico
        .jpeg({ quality: 90 }) //disponivel para imagens jpeg, aceita um objeto de opcoes entre elas quality que serve para especificar a qualidade da imagem
        .toFile(`public/img/tours/${filename}`); //Serve para  salvar o imagem processada no destino que especificarmos
      req.body.images.push(filename);
    })
  );

  next();
});

export const aliasTopTour = function (req, res, next) {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,summary,ratingsAverage,difficulty';

  next();
};

export const getAllTours = factory.getAll(Tour);
// export const getAllTours = catchAsync(async function (req, res, next) {
//   //nos tambem temos outra maneira de filtrar
//   // const query = Tour.find()
//   //   .where('duration')
//   //   .equals(5)
//   //   .where('difficulty')
//   //   .equals('easy');

//   //Quando quizermos pegar os dados do query da url no usamos o req.query
//   //Que nos da um objeto com as query

//   //127.0.0.1:3000/api/v1/tours?duration=20&difficulty=easy

//   //Execute the Query
//   const features = new APIFeatures(Tour.find(), req.query)
//     .filter()
//     .sort()
//     .limitFields()
//     .pagination();

//   const tours = await features.query;

//   res.status(200).json({
//     status: 'success',
//     results: tours.length,
//     data: {
//       tours,
//     },
//   });
// });
const wait = (t) => {
  return new Promise(function (resolve, reject) {
    setTimeout(resolve(), t * 1000);
  });
};
export const getTour = factory.getOne(Tour, { path: 'reviews' });

//export const createTour = catchAsync(async function (req, res, next) {
//tem esta forma
// const newTour = new Tour({})
// newTour.save()
//e esta outra tambem ela cria e salva o documento no database e tambem retorna um promise com o documento salvado
// const newTour = await Tour.create(req.body);
// res.status(201).json({
//   status: 'success',
//   data: {
//     tour: newTour,
//   },
// });

// try {
// } catch (err) {
//   res.status(400).json({
//     status: 'failed',
//     message: err.message,
//   });
// }
//});

// export const updateTour = catchAsync(async function (req, res, next) {
//   const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
//     new: true,
//     //esta opcao serve para dizer que queremos o documento novo/atuaizado seja retornado para o cliente
//     runValidators: true,
//});

//   if (!tour) return next(new AppError('No tour found with that id', 404));

//   res.status(200).json({
//     status: 'success',
//     data: {
//       tour,
//     },
//   });
// });
export const createTour = factory.createOne(Tour);
export const updateTour = factory.updateOne(Tour);

export const deleteTour = factory.deleteOne(Tour);

// export const deleteTour = catchAsync(async function (req, res, next) {
//   const tour = await Tour.findByIdAndDelete(req.params.id);
//   if (!tour) return next(new AppError('No tour found with that id', 404));
//   res.status(204).json({
//     status: 'success',
//     data: null,
//   });
// });

//Agora nos veremos sobre aggregation pipeline
//Ele funciona de forma similar a uma query
//ele faz com todos o documentos de uma solucao passe por stages
//Isso pode ter com objetivo por exemplo calcular o media de algum field

export const getTourStats = catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
    //Primeiro tem stage $match onde basicamente iremo filtrar apenas os documentos que queremos

    { $match: { ratingsAverage: { $gte: 4.5 } } },
    //Segundo tem stage $group onde iremos separar em gropos

    {
      $group: {
        //NO _id no colocamos o field que queremos que sejam grupados por
        //quando nao quizermor separalos em grupos nos usamos _id: null
        _id: '$difficulty',
        //Aqui nos estams somando os valores
        numRatings: { $sum: '$ratingsQuantity' },
        //isso faz com que a cada documento numTour seja incrementado em 1
        numTour: { $sum: 1 },
        //aqui iremos calcular a media de alguns fields
        //E o mongodb tem um operador para isso que é o $avg
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        //para caucular o valor minimo nos usamos o operador $min
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
      },
    },
    //Nos tambem podemos sort o resultados
    {
      $sort: {
        //Aqui nos temos que especificar o field pelo qual queremos sort os resultados
        //nos usamos 1 para crecente e menos -1 para decrecente
        avgPrice: 1,
      },
    },
    //Nos tambem podemos repetir stages
    //Por exemplo o match, mas lembre-se este match e sort acima seram usados nos stats e nao nos documentos
    //Pois neste momento o que esta na pipeline sao eles
    // {
    //   $match: {
    //     //no mongodb tam tem o operado $ne que significa not
    //     //Lembre-se que o id que selecionamos antes era a difficulty

    //     //isso ira selecionar todos os documentos que nao sao 'easy'
    //     _id: '$minPrice'
    //   }
    // }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      stats,
    },
  });
});

export const getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = +req.params.year;
  const plan = await Tour.aggregate([
    {
      //O unwind serve para cria um documento para cada elemento que aparece um array
      //neste exemplo estamos usando o startDates e cada tour tem 3 dates no startDates
      //Ou seja seram como temos nove tour sera criados 27 tour
      $unwind: '$startDates',
    },
    {
      $match: {
        //o mongodb e capaz de fazer comparaçoes entre datas
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },

    {
      $group: {
        //no mongodb tambem tem um operador month que nos retorna o mes de uma data
        //CASO QUEIRA SABER MAIS SOBRE OPERADORES DO MONGO VA NO MONGODB DOCS
        _id: { $month: '$startDates' },
        numTourStarts: { $sum: 1 },
        //para cria um array nos usamo $push

        tours: { $push: '$name' },
      },
    },

    {
      $addFields: { month: '$_id' },
    },
    //para esconder um field nos usamos project
    {
      $project: {
        //para nao mostrar o field nos colocamos zere e para monstrar colocarmo 1
        _id: 0,
      },
    },
    {
      $sort: { numTourStarts: -1 },
    },
    //tambem tem o $limit que limita os resultados ao valor especificado
    {
      $limit: 12,
    },
  ]);

  res.status(200).json({
    status: 'success',
    results: plan.length,
    data: {
      plan,
    },
  });
});

// /tour-within/:distance/center/:latlng/unit/:unit
// /tour-within/200/center/42,49/unit/km
export const getTourWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  //Para pegar o radius nos precisamos dividir a distance pelo raio da terra
  //como a distancia da terra e diferente em miles km
  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;
  if (!lat || !lng) {
    return next(
      new AppError(
        'please provid latitude and longitude in the format lat,lng',
        400
      )
    );
  }

  //Agora nos iremos usar um geoSpatial operator para pesquisar por tour quem em esjetam dentro de uma
  // esfera com o raio sendo a distacia
  const tours = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } },
  });
  //Para poder ter acesso ao geosptial data e necessario que se tenha um index para field neste caso o startLocation

  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      data: tours,
    },
  });
});

//Esta funcao serve para pegar as distancias entre o usuario e os tour
export const getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  if (!lat || !lng) {
    return next(
      new AppError(
        'please provid latitude and longitude in the format lat,lng',
        400
      )
    );
  }

  const multiplier = unit === 'mi' ? 0.000624371 : 0.001;

  const distances = await Tour.aggregate([
    //Este  é o unico geoSpatial Stage que existe
    //geoNear SEMPRE DEVE SER O PRIMEIRO STAGE EM AGREGATION PIPELINE SOBRE GEOSPATIAL
    //ele tambem necissita que ao menos um dos nossos fields contenham o geospatial index
    //se vc tiver mais de um field com geospatial index vc precisa especifica-lo, caso tenha apenas 1 isso nao e necessario
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [lng * 1, lat * 1],
        },
        distanceField: 'distance',
        distanceMultiplier: multiplier,
      },
    },
    {
      $project: {
        distance: 1,
        name: 1,
      },
    },
  ]);

  res.status(200).json({
    status: 'success',
    results: distances.length,
    data: {
      data: distances,
    },
  });
});
