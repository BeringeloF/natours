export class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    const queryObj = { ...this.queryString };
    //nos nao podemos passar o req.query diretamente pois pode haver outros parametro que nao esperamos
    //entao primeiro nos temos que excluir este parametros indesejados
    const excludeFields = ['page', 'sort', 'limit', 'fields'];
    excludeFields.forEach((el) => delete queryObj[el]);

    //pare ler documentos no dat, aBase nos usamos o metodo find
    //lembre-se quando queremos todos os documentos nos nao passamos nada
    //Se quisermos fazer chaining nos nao podemos 'await' a query pois quando usamos ele ja retorna o documento
    //entao primeiro nos apenas construimos a query e depois a executamos
    //Agora iremos ver um filtro mais avançado onde usaremos os operadores maior que  menor quer etc... do mongodb
    //e para isso nos temos que color um [] na url depois do nome e colocar dentro do [] o operador
    //Ex:127.0.0.1:3000/api/v1/tours?duration[gte]=5&difficulty=easy&page=2
    //porem isto ainda nao esta certo ja que em mongo deve se ter um $ anted do operados entao temo que corrigir
    let queryStr = JSON.stringify(queryObj);

    queryStr = queryStr.replace(/\b(gte|gt|lt|lte)\b/g, (match) => `$${match}`);

    this.query = this.query.find(JSON.parse(queryStr));

    return this;
  }

  sort() {
    //Sorting
    //exemplo de url quando queremos sort por price
    //127.0.0.1:3000/api/v1/tours?sort=price
    if (this.queryString.sort) {
      //quando sort pode haver elemetos que tenham o mesmo valor neste caso nos definimos um criterio de desempate
      //POR PADRAO ELE VEM EM FORMA CRENCENTE CASO QUERIA EM DECRESENTE ADICIONE UM -AO PAREMTRO QUE VC QUE SORT POR
      //fazendo isto:
      //127.0.0.1:3000/api/v1/tours?sort=-price,duration
      const sortBy = this.queryString.sort.split(',').join(' ');
      //Este sort metodo é o do mongoose nao confunda e ele aceita mais de um parametro o primero sera
      //o que ele ira sort por e segundo se vc passar se usado como criterio de desempate e terceiro como crieterio do segundo e assim vai...
      //Mas lembre vc os parametro deve ser um unica string com os paratros sepador pos espaços
      //Ex: 'price duration ratingsAverage'
      this.query = this.query.sort(sortBy);
    } else {
      //Por padrao os resultados devem ser sort pelo createdAt
      this.query = this.query.sort('-createdAt');
    }
    return this;
  }

  limitFields() {
    //Agora nos iremos permitir que o usuario escolha quais fields ele ira querer que sejam retornados
    //A url seria assim 127.0.0.1:3000/api/v1/tours?fields=name,price,ratingsAverage,description,_id
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      //secect() serve para selecionar apenas os fields que especificarmos
      this.query = this.query.select(fields);
    } else {
      //Aqui nos iremos selecionar para nao mandar o __v que o mongoose cria
      //para isso nos fazemos assim
      this.query = this.query.select('-__v');
    }
    return this;
  }

  pagination() {
    //Pagination
    //exemplo de url:  127.0.0.1:3000/api/v1/tours?page=2&limit=10
    //o skip serve para mostrar quantas resultados serao pulados antes de chegar a pagina requisitada
    //ex: 1-10 page 1, 11-20 page 2, 21-30 page 3
    const page = +this.queryString.page || 1;
    const limit = +this.queryString.limit || 100;
    const skip = (page - 1) * limit;
    this.query = this.query.skip(skip).limit(limit);

    return this;
  }
}
