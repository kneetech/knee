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
      if (/^\.\.?\//.test(config.__filename)) {
        Class = require(path.resolve(this.__filename, config.__filename));
      } else {
        Class = require(config.__filename);
      }
    }

    return new Class(config);
  }

  moduleInject(target, name, module) {
    if (target.hasOwnProperty(name)) {
      throw new Error(`Установить модуль ${module.constructor.name} в ${target.constructor.name}, т.к. свойство с именем "${name}" уже определено`);
    }

    if (module instanceof this.constructor) {
      throw new Error(`Включаемое значение не является модулем ${module}`);
    }

    target[name] = module;
  }

  moduleBased(target, basename, module) {
    if (this.constructor.type(basename, this.constructor.TYPE_STRING)) {
      this.moduleInject(target, basename, module);
    } else if (this.constructor.type(basename, this.constructor.TYPE_OBJECT)) {
      for (let key in basename) {
        if (basename.hasOwnProperty(key)) {
          let name = basename[key];

          if (this.constructor.type(name, this.constructor.TYPE_STRING)) {
            this.moduleInject(target, key, module[name]);
          } else if (this.constructor.type(name, this.constructor.TYPE_FUNCTION)) {
            this.moduleInject(target, key, name(module));
          }
        }
      }
    }
  }

  /**
   * Загрузит модули
   * @return {Promise}
   */
  modulesLoad() {
    if (this.hasOwnProperty('modules')) {
      return this.constructor.queue(this.modules, (config) => this.moduleLoad(config || {}));
    }
  }

  /**
   * Загрузит модули из конфигурации
   * @param {Object} config
   * @return {Promise}
   */
  moduleLoad(config) {
    if (config.hasOwnProperty('__share') && !config.hasOwnProperty('__filename')) {
      let instance = SHARE.get(config.__share),
          basename = {};

      if (config.hasOwnProperty('__basename')) {
        basename = config.__basename;
      } else if (instance.hasOwnProperty('__basename')) {
        basename = instance.__basename;
      } else {
        throw new Error(`Нельзя включать публичный модуль "${instance.constructor.name}" без указания параметра "__basename" (${this.constructor.name})`);
      }

      return instance.onInitialized
          .then(() => {
            this.moduleBased(this, basename, instance);
          });
    }

    let instance = this.moduleCreate(config);

    return instance.onInitialized
        .then(() => {
          if (instance.hasOwnProperty('__share')) {
            SHARE.set(instance.__share, instance);
          }

          if (instance.hasOwnProperty('__basename')) {
            this.moduleBased(this, instance.__basename, instance);
          }
        });
  }
}

const SHARE = new Module({
  initialize() {
    this.modules = {};
  },

  get(name) {
    if (!this.constructor.type(name, this.constructor.TYPE_STRING)) {
      throw new Error(`Неправильное имя модуля ${name}`);
    }

    if (!this.modules.hasOwnProperty(name)) {
      throw new Error(`Модуль "${name}" не найден среди опубликованных`);
    }

    return this.modules[name];
  },

  set(name, module) {
    if (!this.constructor.type(name, this.constructor.TYPE_STRING)) {
      throw new Error(`Неправильное имя модуля ${name}`);
    }

    if (module instanceof Module === false) {
      throw new Error(`Не является модулем ${this.constructor.type(module)}`);
    }

    if (this.modules.hasOwnProperty(name)) {
      throw new Error(`Модуль с имененм ${name} уже был опубликован ранее`);
    }

    this.modules[name] = module;
  }
});

module.exports = Module;