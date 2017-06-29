const Module = require('./base/module');

if (typeof process.argv[2] !== 'string') {
  throw new Error('Нет конфигурации');
}

module.exports = new Module(require(process.argv[2]));
