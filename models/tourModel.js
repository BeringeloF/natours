import mongoose from 'mongoose';
import slugify from 'slugify';
//import User from './userModel.js';
import validator from 'validator';

const datesObj = new mongoose.Schema({
  date: {
    type: Date,
  },
  participants: {
    type: Number,
    default: 0,
  },
  soldOut: {
    type: Boolean,
    default: false,
  },
});

const tourSchema = new mongoose.Schema(
  {
    //nos tambem podemos passar um objeto com opcoes ex:
    name: {
      type: String,
      //aqui no required nos podemos passar dois parametro o primeiro um boolean
      //e o segundo a mensagem de erro caso passemos true e o campo nao seja preenchido
      required: [true, 'a tour must have a name'],
      //aqui nos dizemos que esta propriedade é unica em cada documento ou seja nao pode ser criado nenhum documento com o mesmo valor
      unique: true,
      trim: true,
      maxLength: [40, 'A tour name must have less or equal then 40 caracters'],
      minLength: [10, 'A tour name must have more or equal then 10 caracters'],
      // validate: [validator.isAlpha, 'tour name must only contains characters'],
    },
    slug: String,
    price: {
      type: Number,
      required: [true, 'a tour must have a price'],
    },
    duration: {
      type: Number,
      required: [true, 'a tour must have a duration'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'a tour must have a group size'],
    },
    difficulty: {
      type: String,
      required: [true, 'a tour must have a difficulty'],
      //enum serve para dizer que valor sao permitidos
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficulty is either easy, medium or difficult',
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.4,
      min: [1, 'ratings must be above 1.0'],
      max: [5, 'ratings must be below 5.0'],
      //No iremos definir set function para fazer o round do valor
      //a set function é executado toda vez qua a um novo valor no field
      set: (val) => Math.round(val * 10) / 10,
    },

    priceDiscount: {
      type: Number,
      //Agora nos iremos criar nosso proprio validator
      //LEMBRE-SE ESSE VALIDATOR COM THIS KEYWORD CRIADOS POR NOS APENAS FUNCINAM QUANDO CRIANDO UM DOCUMENTO
      //ELES NAO FUNCIONAM QUANDO VAMOS UPDATE/ATUALIZAR O DOCUMENTO
      validate: {
        validator: function (val) {
          //o this nesta function aponta para o documento
          return val < this.price;
        },
        message: 'Discount price({VALUE}) shoud be below the regular price',
      },
    },

    summary: {
      type: String,
      required: [true, 'a tour must have a summary'],
      //trim é uma option disponivel apenas para string que remove todos os espaços antes e depois da string
      trim: true,
    },

    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String,
      required: [true, 'a tour must have a cover image'],
    },
    //para defirnirmos um array nos fazemos assim
    images: [String],

    createdAt: {
      type: Date,
      default: Date.now(),
      //o select serve para escoder este field no output ou seja ele nao sera acessive no output
      select: false,
    },
    startDates: {
      type: [Date],
    },
    dates: {
      type: [datesObj],
      default: undefined,
    },

    secretTour: {
      type: Boolean,
      default: false,
    },
    startLocation: {
      //mongodb usa um formato especial para representar geoSpatial data chamado geojson
      type: {
        type: String,
        default: 'Point',
        enum: ['Point'],
      },
      coordinates: [Number],
      address: String,
      description: String,
    },
    //para criar embeded documents em mongodb nos sempre usamos arrays
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point'],
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number,
      },
    ],
    //Agora nos iremos criar normalized documents dentro de guides
    //Passando eles como referencia
    guides: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
      },
    ],
  },
  //Objeto com opcoes
  {
    //Isso aqui serve para mostrar no output virtual properties
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

//Aqui nos iremos implementar indexes
//index devem ser usados nos field que mais seram usados como query em uma query
// 1 significa que iremos organzar os index em ordem acendente
// tourSchema.index({ price: 1 });
//Nos tambem podemos fazer ele composto e ele tambem funciona quando iremos pesquisar por apenas um dos field indidualmente que
//declaramos aqui
tourSchema.index({ price: 1, ratingsAverage: -1 });
tourSchema.index({ slug: 1 });
//Para geospatial data voce deve atribuir um valor diferente ao index
tourSchema.index({ startLocation: '2dsphere' });

//agora veremos virtual properties que sao propriedades que nao sao armazenadas no dataBase
//geralmente sao propriedade que podem ser facilmente obtidas atravez de outras propriedades

//E assim que criamos uma virtual propertie
//Por usar o metodo get esta propriedade so estara disponivel assim que algem 'pegar' get algum dado no data base

//LEMBRE-SE VIRTUAL PROPERTIES NAO PODEM SER USADAS EM QUERYS JA QUE NAO EXISTEM NO NOSSO DATABASE
tourSchema.virtual('durationWeeks').get(function () {
  return this.duration / 7;
});

//agora nos iremos usar virtual populate que é uma maneira mais eficiente de populate o document
//pra fazer isso nao temos que ter feito parent referencing no documento que queremos inserir

//Virtual populate
tourSchema.virtual('reviews', {
  ref: 'Review',
  //esta propriedade serve para dizer que field do review esta referenciado o tour neste caso é o field tour que tem o id do tour
  foreignField: 'tour',
  //Local field é field que esta sendo deste tourShema que esta sendo referenciado em review
  localField: '_id',
});

//em mongoose tambe exitem middlewares pre que acontece antes de um certo evento e post que acontece depois de um evento

//Este é um document middleware que é executa antes do comando .save() e .create() MAS NAO NO .insertMany()

//o this keyword em um document middleware aponta para o documento que esta sendo salvo e usa calback function tem acesso
//ao next

tourSchema.pre('save', function (next) {
  this.slug = slugify(this.name, { lower: true });

  next();
});

tourSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangedAt',
  });
  next();
});

//EMBEDED DENORMALIZED FORM
// tourSchema.pre('save', async function (next) {
//   const guidesPromise = this.guides.map(async (id) => await User.findById(id));
//   this.guides = await Promise.all(guidesPromise);

//   next();
// });

// //agora veremos um post middleware
// //e ele tem acesso a dois parametros o doc, o next
// //LEMBRE-SE AQUI NOS NAO TEMOS O ACESSO AO DOCUMENTO ATRAVEZ DO THIS E SIM DO PARAMTRO DOC
// tourSchema.post('save', function (doc, next) {
//   console.log(doc);
//   next();
// });

//Agora veremos um query middleware
//este tipo de middleware e executado antes de uma query

//a unica diferença entre o document e o query middleware o find
//e aqui o this aponta para o query object

//porem isso tem um problema que se alguem usar um findOne outro metodo find este middleware nao sera acionado
//Para resolver isso nos usamos um regurlar expression que faz com que seja acionado em todo metodo que começa com find
tourSchema.pre(/^find/, function (next) {
  //como o this é um query obejct nos podemos encadar outro find
  this.find({ secretTour: { $ne: true } });
  this.start = Date.now();
  next();
});

//neste post nos temos acesso aos todos documento encontrados com aquela query
// tourSchema.post(/^find/, function (docs, next) {
//   console.log('query took:' + (Date.now() - this.start));

//   next();
// });

//Agora veremos um aggregation middleware

// tourSchema.pre('aggregate', function (next) {
//   this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });

//   next();
// });

//Agora nos criamos um modelo apatir deste schema
const Tour = mongoose.model('Tour', tourSchema);

export default Tour;
