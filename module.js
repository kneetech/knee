const Configurable = require('./configurable');
const fs = require('fs');
const path = require('path');

function queue(collection, handler) {
  let index = 0,
      keys = Array.isArray(collection) ? new Array(collection.length) : Object.keys(collection);

  function next() {
    let result,
        key = keys[index] || index;

    if (keys.length > index) {
      result = handler(collection[key], key);

      if (result instanceof Promise === false) {
        result = Promise.resolve(result);
      }

      return result
          .then(function(result){
            if (result != undefined) {
              collection[key] = result;
            }
          })
          .then(function(){ index++; })
          .then(next);
    }

    return Promise.resolve(result);
  }

  return next().then(() => collection);
}

/**
 * @property {Object} components
 * @property {Array} modules
 */
class Module extends Configurable {

  configure(config) {
    if (this.constructor.hasOwnProperty('defaults')) {
      config = Object.assign({}, this.constructor.defaults, config);
    }

    super.configure(config);

    this.onInitialized = Promise.resolve()
        .then(() => delete this.onInitialized)
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
      if (/^\.\?\//.test(config.__filename)) {
        Class = require(path.resolve(this.__filename, config.__filename));
      } else {
        Class = require(config.__filename);
      }
    }

    return new Class(config);
  }

  /**
   * Устновит модуль или его свойства в текущий объект
   * @param {Module} instance
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
      return queue(this.modules, (config) => this.moduleLoad(config));
    }
  }

  /**
   * Загрузит модули из конфигурации
   * @param {Object} config
   * @return {Promise}
   */
  moduleLoad(config) {
    let instance = this.moduleCreate(config);

    if (instance.hasOwnProperty('__basename')) {
      if (typeof instance.__basename === 'string') {
        this.setup(instance.__basename, instance);
      }
    }

    return instance.onInitialized
        .then(() => {
          if (typeof instance.__basename === 'object' && instance.__basename) {
            this.moduleMount(instance);
          }
        });
  }
}

module.exports = Module;