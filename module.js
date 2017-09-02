const Configurable = require('./configurable');
const path = require('path');

/**
 * Модуль
 * @property {String} __filename Имя файла модуля
 * @property {String|Object} __basename Имя модуля в родительском модуле
 * @property {Array} modules Дочерние модули
 */
class Module extends Configurable {

  static get KEY_BASENAME() { return '__basename'; }
  static get KEY_FILENAME() { return '__filename'; }
  static get KEY_DEFINE() { return '__define'; }
  static get KEY_INJECT() { return '__inject'; }
  static get KEY_MODULES() { return 'modules'; }
  static get KEY_DEFAULTS() { return 'defaults'; }
  static get KEY_INITIALIZE() { return 'initialize'; }

  /**
   * Создаст эксземпляр с конфигурацией принятой в process.argv[2]
   * @return {Module}
   */
  static create() {
    let config = {};

    if (this.type(process.argv[2], this.constructor.TYPE_STRING)) {
      config = require(process.argv.splice(2, 1)[0]);
    }

    return new this(config);
  }

  configure(config) {
    if (this.constructor.hasOwnProperty(this.constructor.KEY_DEFAULTS)) {
      config = Module.combine({}, [this.constructor[this.constructor.KEY_DEFAULTS], config]);
    }

    super.configure(config);

    this.onInitialized = Promise.resolve()
        .then(() => this.modulesLoad())
        .then(() => this[this.constructor.KEY_INITIALIZE]())
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

    if (config.hasOwnProperty(this.constructor.KEY_FILENAME)) {
      if (/^\.\.?\//.test(config[this.constructor.KEY_FILENAME])) {
        Class = require(path.resolve(this[this.constructor.KEY_FILENAME], config[this.constructor.KEY_FILENAME]));
      } else {
        Class = require(config[this.constructor.KEY_FILENAME]);
      }
    }

    return new Class(config);
  }

  moduleInject(target, name, module) {
    if (target.hasOwnProperty(name)) {
      throw new Error(`Установить модуль ${module.constructor.name} в ${target.constructor.name}, т.к. свойство с именем "${name}" уже определено`);
    }

    target[name] = module;
  }

  moduleBased(target, basename, module) {
    if (this.constructor.type(basename, this.constructor.TYPE_STRING)) {
      this.moduleInject(target, basename, module);
    } else if (this.constructor.type(basename, this.constructor.TYPE_OBJECT)) {
      return this.constructor.queue(Object.keys(basename), (key) => {
        let name = basename[key],
            value;

        if (this.constructor.type(name, this.constructor.TYPE_STRING)) {
          if (this.constructor.type(module[name], this.constructor.TYPE_FUNCTION)) {
            value = module[name].bind(module);
          } else {
            value = module[name];
          }
        } else if (this.constructor.type(name, this.constructor.TYPE_FUNCTION)) {
          value = name(module);

          if (this.constructor.type(value, this.constructor.TYPE_PROMISE)) {
            return value.then((value) => this.moduleInject(target, key, value));
          }
        } else {
          throw new Error(`Свойство ${module.constructor.name}.__basename.${key} содержит не допустимое значение`);
        }

        this.moduleInject(target, key, value);
      });
    }
  }

  /**
   * Загрузит модули
   * @return {Promise}
   */
  modulesLoad() {
    if (this.hasOwnProperty(this.constructor.KEY_MODULES)) {
      return this.constructor.queue(this[this.constructor.KEY_MODULES], (config) => this.moduleLoad(config));
    }
  }

  /**
   * Загрузит модули из конфигурации
   * @param {Object} config
   * @param {String} config.__inject
   * @param {String} config.__share
   * @param {String|Object} config.__basename
   * @param {String} config.__filename
   * @return {Promise}
   */
  moduleLoad(config) {
    if (!config.hasOwnProperty(this.constructor.KEY_INJECT)) {
      let instance = this.moduleCreate(config);

      if (config.hasOwnProperty(this.constructor.KEY_DEFINE)) {
        this.moduleSetToScope(config[this.constructor.KEY_DEFINE], instance);
      }

      return instance.onInitialized
          .then(() => {
            if (config.hasOwnProperty(this.constructor.KEY_BASENAME)) {
              return this.moduleBased(this, config[this.constructor.KEY_BASENAME], instance);
            } else if (instance.hasOwnProperty(this.constructor.KEY_BASENAME)) {
              return this.moduleBased(this, instance[this.constructor.KEY_BASENAME], instance);
            }
          });
    }

    let instance = this.moduleGetFromScope(config[this.constructor.KEY_INJECT]);

    if (config.hasOwnProperty(this.constructor.KEY_DEFINE)) {
      this.moduleSetToScope(config[this.constructor.KEY_DEFINE], instance);
    }

    if (config.hasOwnProperty(this.constructor.KEY_BASENAME)) {
      return this.moduleBased(this, config[this.constructor.KEY_BASENAME], instance);
    } else if (instance.hasOwnProperty(this.constructor.KEY_BASENAME)) {
      return this.moduleBased(this, instance[this.constructor.KEY_BASENAME], instance);
    } else {
      throw new Error(`Не удалось включить модуль ${instance.constructor.name} в ${this.constructor.name} т.к. не определена опция __basename`);
    }
  }

  moduleGetFromScope(name) {
    if (!this.constructor.type(name, this.constructor.TYPE_STRING)) {
      throw new Error(`Неправильное имя модуля ${name}`);
    }

    if (!this.constructor.scope.hasOwnProperty(name)) {
      throw new Error(`Модуль "${name}" не найден среди опубликованных (${Object.keys(this.constructor.scope).join()})`);
    }

    return this.constructor.scope[name];
  }

  moduleSetToScope(name, module) {
    if (!this.constructor.type(name, this.constructor.TYPE_STRING)) {
      throw new Error(`Неправильное имя модуля ${name}`);
    }

    if (!this.constructor.type(module, this.constructor.TYPE_MODULE)) {
      throw new Error(`Не является модулем ${this.constructor.type(module)}`);
    }

    if (this.constructor.scope.hasOwnProperty(name)) {
      throw new Error(`Модуль с имененм ${name} уже был опубликован ранее (${Object.keys(this.constructor.scope).join()})`);
    }

    this.constructor.scope[name] = module;
  }
}

Module.scope = {};

module.exports = Module;