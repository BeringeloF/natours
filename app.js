import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import hpp from 'hpp';
import dotenv from 'dotenv';
import compression from 'compression';
import { router as userRouter } from './routes/userRoutes.js';
import { router as tourRouter } from './routes/tourRoutes.js';
import { router as reviewRouter } from './routes/reviewRoutes.js';
import { router as viewRouter } from './routes/viewRoutes.js';
import { router as authRouter } from './routes/authRoutes.js';
import { router as bookingRouter } from './routes/bookingRoutes.js';
import morgan from 'morgan';
import { AppError } from './utils/appError.js';
import errorControler from './controller/errorControler.js';
import * as authControler from './controller/authControler.js';
import cookieParser from 'cookie-parser';

dotenv.config({ path: './config.env' });
const app = express();

//isso aqui serve para setar a view engine que ira inserir os templates
app.set('view engine', 'pug');
app.set('views', `${process.env.PWD}/views`);

//em express para acessar servir arquivos estaticos nos usamos
app.use(express.static('./public'));
//agora é como se ja tivessemo implementado uma root para cada arquivo e podemos  acessalo no browser

//EM NODE NOS SEMPRE PASSAMOS APENAS O RESOURSE A SER ACESSADO E NAO,
//A AÇAO A SER FEITA POR EXEPLO SE QUISER ATUALILAR TOURS AO INVES DE CRIAR
//UM ROOUTING PARA UPDATETOURS NOS APENAS USAMOS TOURS NORMAL
//COMO SE FOSSE QUAQUEL OUTRO TIPO DE REQUEST A QUE NOS PERMITIRA
//SABER QUE ACAO DEVEMOS IMPLEMENTAR É O METODO DA REQUEST
//ENTAO SE CHEGAR UM REQUEST COM O METODO GET NOS ENVIARES OS DADOS
// E SE CHEGAR UMA REQUEST COM O METODO POST COM O MESMO ROUTING
//NOS ENVIAREMOS OS DADOS AO DATA BASE
//ENTAO COMO PODE VER A ACAO A SER TOMADA E ESPECIFICADA PELO METODO

// global middleware
//nos precisamos disto para o poder ter o request body
console.log(process.env.NODE_ENV, 'development');
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}
// global middleware

//Aqui nos iremo criar um limitador de request que podem ser feitas ao nosso sevidor, isso serve para previnir DDOS ATACKS
//QUE CONSISTEM EM SPAMAR REQUEST PARA CHASHAR NOSSO SERVIDOR

const limiter = rateLimit({
  //max serve para limitar o maximo de request pemitadas por IP
  max: 100,
  //o windowMs serve para dizer que essa sao permitido essa max em por exemplo 1 hora, ou seja sao permitido 100 request por hora
  windowMs: 60 * 60 * 1000,
  //message é a mensagem que sera enviada quando o limit de request for atingindo
  message: 'Too many requests from this IP, please try again in 1 hour!',
});

//Set security http headers
app.use(helmet());

//agora nos usamos este limitador
app.use('/api', limiter);

//Body parser reading data from body into req.body

//e como medida de segurança nos tambem podemos limitar o tamnha dos dados que aceitamos
app.use(express.json({ limit: '10kb' }));
app.use(
  express.urlencoded({
    extended: true,
    limit: '10kb',
  })
);
app.use(cookieParser());

//Agora nos iremos fazer dataSanitization que é limpar os dados que entram em nossa aplicaçao de cogigo maliciosos
//neste  ataques eles utilizao qury para conseguir ter acessos aos dados no nosso database ex: "email": {"$gt": ""}, com isso eles apenas precisam saber a senha e entao teriam acesso ao nosso dataBase
//contra noSql query ingection e contra XSS

//contra noSql
app.use(mongoSanitize());

//contra xss que malicius html code que pode conter js, com esse codigo malicioso eles podem executar codigos dentro de nossa aplicaçao por isso nos temos que  usar o xss
app.use(xss());

//agora nos iremos lidar com parameter polution que quando ha duplos pametros e um atacker pode usar esse duplos parametros
//para previnir isso nos usamos o hpp que remove os paremtros duplos
//Porem alguns parametros podem ser duplos entao para permitilos no passamos ele em whitelist
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  })
);

//este aqui é uma middleware é uma funcao que vai ser acinada no
//meio do ciclo, entao vai ser antes de enivar o response
//SEMPRE TEMOS QUE CHAMAR O NEXT
//Esse moiddleware que definimos é global entao sera executado em todos chamadas
//  OS MIDDLEWARE SAO CHAMADOS NA ORDEM EM QUE FORAM DECLARADOS
app.use((req, res, next) => {
  console.log('hello from the middleware');

  next();
});

//usando um package para comprimir as resposta htlm/json para deixar mais leve

app.use(compression());

//Agora nos iremos manipular o request
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();

  next();
});
//Aqui em express para implementarmos rooutin nos usamos o metodo get
//Isso aqui é o codigo que sera executado quando uma get request for enviado nesta url '/'

// app.get("/api/v1/tours", getAllTours);

//para pegar uma variavel definada na url nos usamos : e um nome qualquel
//Isso faz com que esse valor da url seja automaticamente salva em um objeto
//na propriedade com o mesmo nome que definimos

//Nos tambem poderiamos definir mais variaveis na  url se quisermos
//Este objeto esta em res.params

//Porem isso pode causar um problema pois agora o roouting que estamos buscando
//deve ter sempre esta variaveis e caso nao estejam no url
//Isso resultaria em erro, para resolver isso nos podemos utilizar
//optional parameters adcinando um ? depois do parametro

// app.get("/api/v1/tours/:id", getTour);
// app.post("/api/v1/tours", createTour);
// app.patch("/api/v1/tours/:id", updateTour);
// app.delete("/api/v1/tours/:id", deleteTour);

app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "script-src 'self' https://unpkg.com https://js.stripe.com; worker-src 'self' blob: https://unpkg.com;"
  );
  next();
});

//Routes

//Isso aqui é chamado de mounting, o que nos fizemos foi criar um middleware para estes routes
// Esse middleware vai ter todos as responses para diferentes metodos
app.use('/api/v1/auth', authRouter);
app.use(authControler.isLoggedIn);
app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

//Agora nos iremos lidar com request em routes que nao criamos
//COMO OS MIDDLEWARE SAO EXECUTADOS EM ORDEM DO PRIMEIRO QUE APERECER ATE O ULTIMO QUE APARECER
//LEMBRE-SE O OS ROUTES TAMBEM SAO UM MIDDLEWARE
//ENTAO ISSO QUER DIZER QUE SE ALGUM REQUEST CHEGAR ATE ESTE PONTO DO CODIGO ISTO SIGNIFICA QUE
//ELA NAO FOI PEGA POR NENHUM DOS NOSSOS ROUTERS HANDLERS

//aqui como nos queremos lidar com todos os tiopos de metodos de requests que nao estao sendo lidadas
//nos usamos app.all para dizer que esta vai ser uma route para todos os metodos

//e usamo o * para dizer que pode ser em qualquer resourse
app.all('*', (req, res, next) => {
  // const err = new Error(`cant find ${req.originalUrl} on this server`);
  // err.status = 'failed';
  // err.statusCode = 404;
  //QUANDO PASSAMOS QUALQUER ARGUMETO NO next() O EXPRESS VAI ASSUMIR QUE UM ERRO OCORREU E IRA PULAR TODO MIDDLEWARE STACK E IRA ENVIAR O ERRO
  //AO ERROR HADLING MIDDLEWARE
  next(new AppError(`cant find ${req.originalUrl} on this server`, 404));
});

//Agora nos veremos como lidar com error usando o middleware de errorhandling do express
//para usa-lo nos fazemos assim primeiro app.use() e passamo com argumento um funcao com  4 parametros o so de fazer isso o expres
//ja ira notar que esta é uma error handling middleware
//e neste middle ware o primero parametro é o erro

app.use(errorControler);

export default app;
