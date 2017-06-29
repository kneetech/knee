const Configurable = require('./configurable');
const utils = require('./utils');
const fs = require('fs');
const path = require('path');

/**
 * @property {Object} components
 * @property {Array} modules
 */
class Module extends Configurable {

  configure(config) {
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

    config = this.moduleConfigPrepare(Class, config);

    return new Class(config);
  }

  /**
   * Подготовит конфигурацию модуля
   * @param {Function} Class
   * @param {Object} config
   * @return {Object}
   */
  moduleConfigPrepare(Class, config) {
    if (Class.hasOwnProperty('defaults')) {
      config = Object.assign({}, Class.defaults, config);
    }

    return config;
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
      return utils.queue(this.modules, (config) => this.moduleLoad(config));
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

    this.moduleInstancePrepare(instance);

    return instance.onInitialized
        .then(() => {
          if (typeof instance.__basename === 'object' && instance.__basename) {
            this.moduleMount(instance);
          }
        });
  }

  /**
   * Подготовит модуль
   * @param {Module} instance
   */
  moduleInstancePrepare(instance) {

  }
}

module.exports = Module;