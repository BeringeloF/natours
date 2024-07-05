import mongoose from 'mongoose';
import runFirst from './rusFirst.js';
import app from './app.js';

let DB = process.env.DATABASE;

DB = DB.replace('<PASSWORD>', process.env.DATABASE_PASSWORD);
//Para nos conectarmos a database nos fazemos isto

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
  })
  .then(() => console.log('DB connection seccusful!'));

// console.log(con.connections);

//Em mongoose nos usamos schemaas que sao o modelo para o se criar os
//documnetos no mongodb, ele é igual uma planta que iremos usar para criar os documentos
//Ele aceita como parametro um objeto onde definimos o data-type que sera passado

//agora nos usamos

// const testTour = new Tour({
//   name: 'The Park Camper',
//   price: 345,
//   rating: 4.6,
// });

//agora nos salvamos
//isso ira salvar este document na database e ira nos retorar um promise com o documento que foi salvo
// try {
//   const savedDocument = await testTour.save();
//   console.log(savedDocument);
// } catch (err) {
//   console.log(err);
// }

const port = process.env.PORT || 3000;

const server = app.listen(port, '0.0.0.0', () => {
  console.log(`app running on port ${port}...`);
});
console.log('neidh');
//Aqui nos iremos lidar com global unhandleRejection, que podem ocorrer por exemplo quando o senha do server esta errada

process.on('unhandledRejection', (err) => {
  console.log('------------------------------');
  console.log('rejection');
  console.log(err);
  server.close(() => {
    //isso aqui serve para fechar a aplicaçao
    process.exit(1);
  });
});

process.on('SIGTERM', () => {
  console.log(
    'SIGTERM received shuting down after request finishe, made by me'
  );
  server.close(() => {
    //aqui nos nao precissamos do process.exit ja que o proprio SIGTERM ja faz a aplicaçao fechar
    console.log('Process terminated!');
  });
});

//Agora iremos lidar com uncaghtExeptions que sync code
