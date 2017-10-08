const should = require('should');
const Module = require('../module');

describe('Module', function(){

  context('type', () => {

    it('должен определять типы number, integer и float', () => {
      Module.type(1).should.be.equal('integer');
      Module.type(1.1).should.be.equal('float');

      Module.type(1, Module.TYPE_NUMBER).should.be.true();
      Module.type(1, Module.TYPE_INTEGER).should.be.true();
      Module.type(1, Module.TYPE_FLOAT).should.be.false();

      Module.type(1.1, Module.TYPE_NUMBER).should.be.true();
      Module.type(1.1, Module.TYPE_INTEGER).should.be.false();
      Module.type(1.1, Module.TYPE_FLOAT).should.be.true();

      Module.type(1, Module.TYPE_ALL ^ Module.TYPE_NUMBER).should.be.false();
      Module.type(1, Module.TYPE_ALL ^ Module.TYPE_INTEGER).should.be.false();

      Module.type(1.1, Module.TYPE_ALL ^ Module.TYPE_NUMBER).should.be.false();
      Module.type(1.1, Module.TYPE_ALL ^ Module.TYPE_FLOAT).should.be.false();
    });

    it('должен определять тип string', () => {
      Module.type('a').should.be.equal('string');
      Module.type('a', Module.TYPE_STRING).should.be.true();

      Module.type('a', Module.TYPE_ALL ^ Module.TYPE_STRING).should.be.false();
    });

    it('должен определять тип boolean', () => {
      Module.type(true).should.be.equal('boolean');
      Module.type(false, Module.TYPE_BOOLEAN).should.be.true();

      Module.type(true, Module.TYPE_ALL ^ Module.TYPE_BOOLEAN).should.be.false();
    });

    it('должен определять тип function', () => {
      Module.type(() => {}).should.be.equal('function');
      Module.type(() => {}, Module.TYPE_FUNCTION).should.be.true();

      Module.type(() => {}, Module.TYPE_ALL ^ Module.TYPE_FUNCTION).should.be.false();
    });

    it('должен определять тип promise', () => {
      Module.type(new Promise(() => {})).should.be.equal('promise');
      Module.type(new Promise(() => {}), Module.TYPE_PROMISE).should.be.true();

      Module.type(new Promise(() => {}), Module.TYPE_ALL ^ Module.TYPE_PROMISE).should.be.false();
    });

    it('должен определять тип undefined', () => {
      Module.type(undefined).should.be.equal('undefined');
      Module.type(undefined, Module.TYPE_UNDEFINED).should.be.true();

      Module.type(null).should.not.be.equal('undefined');
      Module.type(null, Module.TYPE_UNDEFINED).should.not.be.true();

      Module.type(undefined, Module.TYPE_ALL ^ Module.TYPE_UNDEFINED).should.be.false();
    });

    it('должен определять тип object', () => {
      Module.type({}).should.be.equal('object');
      Module.type({}, Module.TYPE_OBJECT).should.be.true();

      Module.type(new (function(){})).should.be.equal('object');
      Module.type(new (function(){}), Module.TYPE_OBJECT).should.be.true();

      Module.type({}, Module.TYPE_ALL ^ Module.TYPE_OBJECT).should.be.false();
      Module.type(new (function(){}), Module.TYPE_ALL ^ Module.TYPE_OBJECT).should.be.false();
    });

    it('должен определять тип array', () => {
      Module.type([]).should.be.equal('array');
      Module.type([], Module.TYPE_ARRAY).should.be.true();

      Module.type([], Module.TYPE_ALL ^ Module.TYPE_ARRAY).should.be.false();
    });

    it('должен определять тип null', () => {
      Module.type(null).should.be.equal('null');
      Module.type(null, Module.TYPE_NULL).should.be.true();

      Module.type(undefined).should.not.be.equal('null');
      Module.type(undefined, Module.TYPE_NULL).should.not.be.true();

      Module.type(null, Module.TYPE_ALL ^ Module.TYPE_NULL).should.be.false();
    });

    it('должен определять тип regexp', () => {
      Module.type(/./).should.be.equal('regexp');
      Module.type(/./, Module.TYPE_REGEXP).should.be.true();

      Module.type(/./, Module.TYPE_ALL ^ Module.TYPE_REGEXP).should.be.false();
    });

    it('должен определять тип module', () => {
      Module.type(new Module()).should.be.equal('module');
      Module.type(new Module(), Module.TYPE_MODULE).should.be.true();

      Module.type(new Module(), Module.TYPE_ALL ^ Module.TYPE_MODULE).should.be.false();
    });
  });

  context('queue', () => {

    it('должен выполнять Promise-очередь', (done) => {
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
  });

  context('combine', () => {
    
    it('должен объеденить элементы типа number', () => {
      Module.combine(1, []).should.be.equal(1);
      Module.combine(1.1, []).should.be.equal(1.1);
      Module.combine(1, [2]).should.be.equal(2);
      Module.combine(1.1, [2.1]).should.be.equal(2.1);
      Module.combine(1, [2, 3]).should.be.equal(3);
      Module.combine(1.1, [2.1, 3.1]).should.be.equal(3.1);
      Module.combine(1, [2, 3], { integer(target, source) { return target + source; }}).should.be.equal(6);
      Module.combine(1.1, [2.1, 3.1], { float(target, source) { return target + source; }}).should.be.equal(1.1 + 2.1 + 3.1);
    });

    it('должен объеденить элементы типа string', () => {
      Module.combine('foo', []).should.be.equal('foo');
      Module.combine('foo', ['bar']).should.be.equal('bar');
      Module.combine('foo', ['bar', 'baz']).should.be.equal('baz');
      Module.combine('foo', ['bar', 'baz'], { string(target, source) { return target + source; }}).should.be.equal('foobarbaz');
    });

    it('должен объеденить элементы типа boolean', () => {
      Module.combine(true, []).should.be.true();
      Module.combine(true, [false]).should.be.false();
      Module.combine(true, [false, true]).should.be.true();
      Module.combine(true, [false, true], { boolean(target, source) { return target || source; }}).should.be.true();
    });

    it('должен объеденить элементы типа function', () => {
      Module.combine(() => 1, []).call().should.be.equal(1);
      Module.combine(() => 1, [() => 2]).call().should.be.equal(2);
      Module.combine(() => 1, [() => 2, () => 3]).call().should.be.equal(3);
      Module.combine(() => 1, [() => 2, () => 3], { function() { return () => 4; } }).call().should.be.equal(4);
    });

    it('должен объеденить элементы типа object', () => {
      Module.combine({ a: 1 }, []).should.be.have.property('a', 1);
      Module.combine({ a: 1 }, [{ a: 2 }]).should.be.have.property('a', 2);
      Module.combine({ a: { a: 1, b: 0 } }, [{ a: { a: 2 } }]).should.be.deepEqual({ a: { a: 2, b: 0 } });
    });

    it('должен объеденить элементы типа array', () => {
      Module.combine([1], []).should.be.deepEqual([1]);
      Module.combine([1], [[2]]).should.be.deepEqual([2]);
      Module.combine([1], [[2], [3]]).should.be.deepEqual([3]);
      Module.combine([1], [[2], [3]], { array(target, source) { return target.concat(source); }}).should.be.deepEqual([1, 2, 3]);
    });

    it('должен объеденить элементы разных типов', () => {
      Module.combine(1, ['a', null]).should.be.equal(1);
    });
  });

  it('должен работать без конфигурации', function(){
    let module = new Module();

    module.onInitialized.should.be.instanceof(Promise);
  });

  it('должен иметь только сконфигурированные свойства', () => {
    let module = new Module({
      prop1: 'value1',
      prop2: 'value2',
      prop3: {
        prop31: 'value31',
        prop32: ['value321', 'value322']
      }
    });

    Object.keys(module).should.be.deepEqual(['prop1', 'prop2', 'prop3', 'onInitialized']);
    module.prop1.should.be.equal('value1');
    module.prop2.should.be.equal('value2');

    Object.keys(module.prop3).should.be.deepEqual(['prop31', 'prop32']);
    module.prop3.prop31.should.be.equal('value31');
    module.prop3.prop32.should.be.deepEqual(['value321', 'value322']);
  });

  it('должен вызвать метод initialize определённый в конфигурации', function(done){
    new Module({
      initialize() {
        done();
      }
    });
  });

  it('должен дождаться асинхронного выполнения initialize()', (done) => {
    let flag = false,
        module = new Module({
      initialize() {
        return new Promise((resolve) => setTimeout(() => { flag = true; resolve(); }, 0));
      }
    });

    module.onInitialized.then(() => {
      if (flag !== true) {
        done(new Error('метод initialize не был вызван'));
      } else {
        done();
      }
    });
  });

  it('должен дождаться асинхронной инициализации подмодулей', (done) => {

    new Module({
      initialize() {
        this.module1.ready.should.be.true();
        this.module2.ready.should.be.true();

        done();
      },

      modules: [{
        __basename: 'module1',
        initialize() {
          return new Promise((resolve) => {
            setTimeout(() => { this.ready = true; resolve(); }, 0);
          });
        }
      }, {
        __basename: 'module2',
        initialize() {
          return new Promise((resolve) => {
            setTimeout(() => { this.ready = true; resolve(); }, 0);
          });
        }
      }]
    });
  });

  it('не должен вызывать при инициализации метод configure определённый в конфигурации', function(done){
    new Module({
      configure() {
        done(new Error('Вызов метода configure из конфигурации'));
      },

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

    let test = new Test({ prop2: { some: 300, list: [undefined, 'x'] }, prop3: undefined });

    test.should.be.have.property('prop1');
    test.prop1.should.be.have.property('value', 100);
    test.prop2.should.be.deepEqual({ value: 200, some: 300, list: [undefined, 'x'] });
    test.prop3.should.be.equal(20);
  });

  context('basename', () => {

    it('должен загружаться и работать без __basename', (done) => {
      let flag = false;

      new Module({
        initialize() {
          if (flag !== true) {
            done(new Error('Подмодуль не быд проинициализирован'));
          } else {
            done();
          }
        },

        modules: [{
          initialize() {
            flag = true;
          }
        }]
      });
    });

    it('должен установить экземпляр модуля в указанное свойство', (done) => {
      new Module({
        initialize() {
          this.foo.prop.should.be.equal('value');

          done();
        },

        modules: [{
          __basename: 'foo',
          prop: 'value'
        }]
      });
    });

    it('должен установить свойства подмодуля в модуль', (done) => {
      new Module({
        initialize() {
          this.prop1.should.be.equal('value1');
          this.prop2.should.be.equal('VALUE2');

          done();
        },

        modules: [{
          __basename: {
            prop1: 'subModuleProp1',
            prop2: (instance) => instance.subModuleProp2.toUpperCase()
          },

          subModuleProp1: 'value1',
          subModuleProp2: 'value2'
        }]
      });
    });

    it('должен установить свойство из функции которая вернёт Promise', (done) => {
      new Module({
        initialize() {
          this.value.should.be.equal('foobar');
          done();
        },

        modules: [{
          __basename: {
            value(instance) {
              return new Promise((resolve) => setTimeout(() => resolve(instance.value + 'bar'), 0));
            }
          },

          value: 'foo'
        }]
      });
    });
  });

  context('share', () => {
    it('Публикация модуля', (done) => {
      new Module({
        initialize() {
          this.sharedModule.prop.should.be.equal('value');

          done();
        },

        modules: [{
          __define: 'myModule',
          prop: 'value'
        }, {
          __inject: 'myModule',
          __basename: 'sharedModule'
        }]
      })
    });
  });
});
