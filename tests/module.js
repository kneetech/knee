const assert = require('assert');
const should = require('should');
const Module = require('../module');

describe('Модуль', function(){

  it('должен выполнять Promise-очередь', function(done){
    let current = 0;

    Module
        .queue([1, 2, 3], (number) => {
          if (current !== number - 1) {
            done(new Error('Ошибка выполнения очереди'));
          }
          return new Promise((resolve) => setTimeout(resolve, 1)).then(() => current = number);
        })
        .then(() => done());
  });

  it('должен объединять объекты', function(){

    Module.mixed({ a: 1 }, { b: 2 }, { c: 3 }).should.be.deepEqual({ a: 1, b: 2, c: 3});
    Module.mixed({ a: { } }, { a: { a: 1, b: {} } }, { a: { b: { a: 2, b: {} } } })
        .should.be.deepEqual({ a: { a: 1, b: { a: 2, b: {} } } });
    Module.mixed([undefined, 2, undefined], [4, undefined, 6]).should.be.deepEqual([4, 2, 6]);

  });

  it('должен работать без конфигурации', function(done){
    let module = new Module();

    Object.keys(module).should.be.deepEqual(['onInitialized']);

    module.onInitialized.then(() => {
      module.should.not.have.property('onInitialized');
      done();
    });
  });

  it('должен иметь только сконфигурированные свойства', function(){
    let module = new Module({
      prop1: 'value1',
      prop2: 'value2',
      prop3: {
        prop31: 'value31',
        prop32: ['value321', 'value322']
      }
    });

    // посторонних свойств не должно быть
    Object.keys(module).should.be.deepEqual(['prop1', 'prop2', 'prop3', 'onInitialized']);

    module.prop1.should.be.equal('value1');
    module.prop2.should.be.equal('value2');

    // только эти свойства. других быть не должно
    Object.keys(module.prop3).should.be.deepEqual(['prop31', 'prop32']);

    module.prop3.prop31.should.be.equal('value31');
    module.prop3.prop32.should.be.deepEqual(['value321', 'value322']);
  });

  it('должен работать с подмодулями без конфигурации', function(){
    new Module({ modules: [] });
    new Module({ modules: new Array(1) });
    new Module({ modules: new Array(8) });
  });

  it('не должен вызывать при инициализации метод configure определённый в конфигурации', function(done){
    new Module({
      configure() {
        done(new Error('Вызов метода configure из конфигурации'));
      }
    });

    done();
  });

  it('должен вызвать метод initialize определённый в конфигурации', function(done){
    new Module({
      initialize() {
        done();
      }
    });
  });

  it('должен использовать стандартную конфигурацию', function(){
    class Test extends Module {}
    Test.defaults = { value: 100 };

    let test = new Test();

    test.should.have.property('value', 100);
  });

  it('должен объединять стандартную и пользовательскую конфигурации', function(){

    class Test extends Module {}
    Test.defaults = { prop1: { value: 100 }, prop2: { value: 200, list: ['a', 'b', 'c'] }, prop3: 20 };

    let test = new Test({ prop2: { some: 300, list: [undefined, 'x'] }, pro3: undefined });

    test.should.be.have.property('prop1');
    test.prop1.should.be.have.property('value', 100);
    test.prop2.should.be.deepEqual({ value: 200, some: 300, list: ['a', 'x', 'c'] });
    test.prop3.should.be.equal(20);

  });

});