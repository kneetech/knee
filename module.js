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
   * Рекурсивно объеденит несколько исходных объектов в один целевой
   * Каждое свойство исходного объекта будет скопировано в целевой
   * только если целевой объект не имеет этого свойства или оно строго
   * равно `undefined`
   * @param {Array|Object} target
   * @param {Array|Object} sources
   * @return {*}
   */
  static mixed(target, ...sources) {
    let mixable = (some) => Array.isArray(some) || (typeof some === 'object' && some);

    if (mixable(target)) {
      while (sources.length) {
        let source = sources.shift();

        if (mixable(source)) {
          let sourceKeys = Object.keys(source);

          for (let i = 0; i < sourceKeys.length; i++) {
            let sourceKey = sourceKeys[i];

            if (target.hasOwnProperty(sourceKey) && target[sourceKey] !== undefined) {
              if (mixable(target[sourceKey]) && mixable(source[sourceKey])) {
                Module.mixed(target[sourceKey], source[sourceKey]);
              }
            } else {
              target[sourceKey] = source[sourceKey];
            }
          }
        }
      }
    }

    return target;
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
      config = Module.mixed({}, config, this.constructor.defaults);
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
      if (/^\.\.?\//.test(config.__filename)) {
        Class = require(path.resolve(this.__filename, config.__filename));
      } else {
        Class = require(config.__filename);
      }
    }

    return new Class(config);
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