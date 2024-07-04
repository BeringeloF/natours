import catchAsync from '../utils/catchAsync.js';
import { AppError } from '../utils/appError.js';
import { APIFeatures } from '../utils/APIFeatures.js';

export const deleteOne = (Model) =>
  catchAsync(async function (req, res, next) {
    const doc = await Model.findByIdAndDelete(req.params.id);
    if (!doc) return next(new AppError('No document found with that id', 404));
    res.status(204).json({
      status: 'success',
      data: null,
    });
  });

export const updateOne = (Model) =>
  catchAsync(async function (req, res, next) {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      //esta opcao serve para dizer que queremos o documento novo/atuaizado seja retornado para o cliente
      runValidators: true,
    });

    if (!doc) return next(new AppError('No document found with that id', 404));

    res.status(200).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });

export const createOne = (Model) =>
  catchAsync(async function (req, res, next) {
    const newDoc = await Model.create(req.body);
    res.status(201).json({
      status: 'success',
      data: {
        tour: newDoc,
      },
    });
  });

export const getOne = (Model, popOptions) =>
  catchAsync(async function (req, res, next) {
    let query = Model.findById(req.params.id);
    if (popOptions) query = query.populate(popOptions);
    const doc = await query;

    if (!doc) return next(new AppError('No document found with that id', 404));

    res.status(200).json({
      status: 'success',
      data: {
        doc,
      },
    });
  });

export const getAll = (Model) =>
  catchAsync(async function (req, res, next) {
    //este filtro serve para que possamos pegar todas as reviews de um certo tour
    //pois cada review tem um field com o id do tour a qual ela pertece
    let filter = {};
    if (req.params.tourId) filter = { tour: req.params.tourId };
    if (req.params.userId) filter = { user: req.params.userId };

    //Execute the Query
    const features = new APIFeatures(Model.find(filter), req.query)
      .filter()
      .sort()
      .limitFields()
      .pagination();

    // const doc = await features.query.explain();
    //Nos usamos o .explain() para pegar as estatisticas da query

    const doc = await features.query;

    res.status(200).json({
      status: 'success',
      results: doc.length,
      data: {
        data: doc,
      },
    });
  });
