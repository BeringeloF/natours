import fs from 'fs';
import Tour from '../../models/tourModel.js';
import User from '../../models/userModel.js';
import Review from '../../models/reviewModel.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: './config.env' });
console.log(Tour, 'iurehiusdf');

let DB = process.env.DATABASE;
DB = DB.replace('<PASSWORD>', process.env.DATABASE_PASSWORD);
console.log(DB);

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
  })
  .then(() => console.log('db connected'));

// console.log(con.connections);
console.log('DB connection seccusful!');

const tour = JSON.parse(
  fs.readFileSync(`${process.env.PWD}/dev-data/data/tours.json`, 'utf-8')
);

const user = JSON.parse(
  fs.readFileSync(`${process.env.PWD}/dev-data/data/users.json`, 'utf-8')
);

const review = JSON.parse(
  fs.readFileSync(`${process.env.PWD}/dev-data/data/reviews.json`, 'utf-8')
);
user.forEach((el) => (el.password = 'test1234'));

tour.forEach((el) => {
  el.dates = [];
  el.startDates.forEach((d) => {
    el.dates.push({
      date: d,
      participants: 0,
      soldOut: false,
    });
  });
});
const importData = async function () {
  try {
    //nos tambem podemos passar um array no create e ele ira criar um documento para cada elelento
    await Tour.create(tour);
    await User.create(user, { validateBeforeSave: false });
    await Review.create(review);

    console.log('data succesfuly loaded');
  } catch (err) {
    console.log(err);
  }
  process.exit(); //para parar a aplicaçao
};

const deleteData = async function () {
  try {
    //e como nos nao passamos nenhum parametro todos os documetos da collecao serao deletados
    await Tour.deleteMany();
    await User.deleteMany();
    await Review.deleteMany();

    console.log('data succesfuly deleted');
  } catch (err) {
    console.log(err);
  }
  process.exit(); //para parar a aplicaçao
};

if (process.argv[2] === '--import') importData();
if (process.argv[2] === '--delete') deleteData();

console.log(process.argv);
