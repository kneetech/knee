const assert = require('assert');
const should = require('should');
const Module = require('../base/module');

describe('Module', function(){
  describe('Конфигурирование стандартных модулей', function(){

    it('Чистый модуль', function(){
      let module = new Module();

      Object.keys(module).should.be.deepEqual(['onInitialized']);
    });

    it('Модуль со свойствами', function(){
      let module = new Module({
        prop1: 'value1',
        prop2: 'value2',
        prop3: {
          prop31: 'value31',
          prop32: ['value321', 'value322']
        }
      });

      Object.keys(module).should.be.deepEqual(['prop1', 'prop2', 'prop3', 'onInitialized']);
    });

    it('Перегрузка initialize в конфигурации', function(done){
      new Module({
        initialize() {
          done();
        }
      });
    });

  });
});