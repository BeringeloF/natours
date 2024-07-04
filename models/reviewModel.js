import mongoose from 'mongoose';
import Tour from './tourModel.js';
import { AppError } from '../utils/appError.js';
const reviewSchema = new mongoose.Schema(
  {
    rating: {
      type: Number,
      required: [true, 'a review shuld have a rating!'],
      min: [1, 'ratings must be above 1.0'],
      max: [5, 'ratings must be below 5.0'],
    },
    review: {
      type: String,
      required: [true, 'a review can not be empty!'],
    },
    createdAt: {
      type: Date,
      default: new Date(Date.now()),
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'review must belong to a tour'],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'review must belong to a user.'],
    },
  },
  //Options for virtual properties
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

//agora nos iremos resolver o problema de um user ser capaz de escrever multiplas reviews para o mesmo tour
//Isso aqui vai fazer  com que cada combinaçao de tour e user tenham que ser unicas ou seja um user nao
// pode escrever multiplas reviews em um mesmo tour
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

reviewSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'user',
    select: 'name photo',
  });
  next();
});

//Isso é um metodo static no schema
//ele sera pra calcular as medias das avaliacoes
reviewSchema.statics.calcAverageRatings = async function (tourId) {
  //o this aqui aponta para mo model
  const stats = await this.aggregate([
    {
      $match: { tour: tourId },
    },
    {
      $group: {
        _id: '$tour',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
  ]);

  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating,
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.4,
    });
  }
};

reviewSchema.post('save', function () {
  //post middleware nao tem acesso ao next!!!!
  //this points to current review
  //porem como este codigo vem antes de declararmos o modelo nos temos que usar o this.construtor

  this.constructor.calcAverageRatings(this.tour);
});

//Agora para calcularmos a media quando for editado ou deletado e mais complexo
//pois nos nao temos acesso ao documento, ja que so podemos usar query middleware

reviewSchema.pre(/^findOneAnd/, async function (next) {
  //lembre-se em um query middleware o this aponta para o queryObj
  //entao nos podemos usar este truque para pegar o documento
  //e nos temos que salvar no this para que possamos ter acesso ao documento no post que é onde iremos realmente calcular a media

  this.r = await this.findOne();
  if (!this.r)
    return next(new AppError('can not find a review with this id!', 404));

  next();
});

reviewSchema.post(/^findOneAnd/, async function () {
  await this.r.constructor.calcAverageRatings(this.r.tour);
});

const Review = mongoose.model('Review', reviewSchema);

export default Review;
