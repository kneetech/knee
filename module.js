const Configurable = require('./configurable');
const fs = require('fs');
const path = require('path');

/**
 * Модуль
 * @property {String} __filename Имя файла модуля
 * @property {String|Object} __basename Имя модуля в родительском модуле
 * @property {Array} modules Дочерние модули
 */
class Module extends Configurable {

  /**
   * Последовательно вызовет обработчик для каждого элемента коллекции
   * Если обработчик вернёт результат отличный от `undefined`, он будет
   * записан в коллекцию
   * @param {Array|Object} collection
   * @param {Function} handler
   * @return {Promise}
   */
  static queue(collection, handler) {
    let index = 0;
    let keys = Object.keys(collection);

    function next() {
      if (keys.length > index) {
        let key = keys[index];
        let result = handler(collection[key], key);

        if (result instanceof Promise === false) {
          result = Promise.resolve(result);
        }

        return result
            .then((result) => result !== undefined && (collection[key] = result))
            .then(() => index++)
            .then(next);
      }

      return Promise.resolve();
    }

    return next().then(() => collection);
  }

  /**
   * Создаст эксземпляр с конфигурацией принятой в process.argv[2]
   * @return {Module}
   */
  static create() {
    let config = {};

    if (typeof process.argv[2] === 'string') {
      config = require(process.argv.splice(2, 1)[0]);
    }

    return new this(config);
  }

  configure(config) {
    if (this.constructor.hasOwnProperty('defaults')) {
      config = Module.combine({}, [this.constructor.defaults, config]);
    }

    super.configure(config);

    this.onInitialized = Promise.resolve()
        // .then(() => delete this.onInitialized)
        .then(() => this.modulesLoad())
        .then(() => this.initialize())
        .catch((error) => console.error(error));
  }

  initialize() {

  }

  /**
   * Создаст экземпляр модуля из конфигурации
   * @param {Object} config
   * @return {Module}
   */
  moduleCreate(config) {
    let Class = Module;

    if (config.hasOwnProperty('__filename')) {
      if (this.constructor.instances.hasOwnProperty(config.__filename)) {
        return this.constructor.instances[config.__filename];
      }
      if (/^\.\.?\//.test(config.__filename)) {
        Class = require(path.resolve(this.__filename, config.__filename));
      } else {
        Class = require(config.__filename);
      }
    }

    let instance = new Class(config);

    if (config.hasOwnProperty('__single') && config.__single === true) {
      this.constructor.instances[config.__filename] = instance;
    }

    return instance;
  }

  /**
   * Устновит модуль или его свойства в текущий объект
   * @param {Object} instance
   */
  moduleMount(instance) {
    for (let name in instance.__basename) {
      if (instance.__basename.hasOwnProperty(name)) {
        let prop = instance.__basename[name];
        if (prop in instance === false) {
          throw new Error(`Отсутствует публикуемое свойство ${instance.constructor.name}.${prop}`);
        }

        let value = instance[prop];

        if (typeof value === 'function') {
          value = value.bind(instance);
        }

        this.setup(name, value);
      }
    }
  }

  /**
   * Установит публичное свойство
   * @param {String} name
   * @param {*} value
   */
  setup(name, value) {
    if (this.hasOwnProperty(name)) {
      throw new Error(`Имя ${name} уже занято`);
    }

    this[name] = value;
  }

  /**
   * Загрузит модули
   * @return {Promise}
   */
  modulesLoad() {
    if (this.hasOwnProperty('modules')) {
      return Module.queue(this.modules, (config) => this.moduleLoad(config || {}));
    }
  }

  /**
   * Загрузит модули из конфигурации
   * @param {Object} config
   * @return {Promise}
   */
  moduleLoad(config) {
    let instance = this.moduleCreate(config);

    if (!instance.hasOwnProperty('__basename') && config.hasOwnProperty('__basename')) {
      instance.__basename = config.__basename;
    }

    if (this.constructor.type(instance.__basename, this.constructor.TYPE_STRING)) {
      this.setup(instance.__basename, instance);
    }

    return instance.onInitialized
        .then(() => {
          if (this.constructor.type(instance.__basename, this.constructor.TYPE_OBJECT)) {
            this.moduleMount(instance);
          }
        });
  }
}

Module.instances = {};

module.exports = Module;