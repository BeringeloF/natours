process.on('uncaughtException', (err) => {
  console.log('------------------------------');
  console.log('uncaughtException SHUTING DOWN');
  console.log(err.name, err.message);
  process.exit(1);
});

const nada = '';
export default nada;
