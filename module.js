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
  static get KEY_SHARE() { return '__share'; }
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

    if (this.constructor.type(process.argv[2], this.constructor.TYPE_STRING)) {
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

      if (config.hasOwnProperty(this.constructor.KEY_SHARE)) {
        SCOPE.set(config[this.constructor.KEY_SHARE], instance);
      }

      return instance.onInitialized
          .then(() => {
            if (config.hasOwnProperty(this.constructor.KEY_BASENAME)) {
              this.moduleBased(this, config[this.constructor.KEY_BASENAME], instance);
            } else if (instance.hasOwnProperty(this.constructor.KEY_BASENAME)) {
              this.moduleBased(this, instance[this.constructor.KEY_BASENAME], instance);
            }
          });
    }

    let instance = SCOPE.get(config[this.constructor.KEY_INJECT]);

    if (config.hasOwnProperty(this.constructor.KEY_SHARE)) {
      SCOPE.set(config[this.constructor.KEY_SHARE], instance);
    }

    if (config.hasOwnProperty(this.constructor.KEY_BASENAME)) {
      this.moduleBased(this, config[this.constructor.KEY_BASENAME], instance);
    } else if (instance.hasOwnProperty(this.constructor.KEY_BASENAME)) {
      this.moduleBased(this, instance[this.constructor.KEY_BASENAME], instance);
    }
  }
}

const SCOPE = new Module({
  initialize() {
    this.modules = {};
  },

  get(name) {
    if (!this.constructor.type(name, this.constructor.TYPE_STRING)) {
      throw new Error(`Неправильное имя модуля ${name}`);
    }

    if (!this.modules.hasOwnProperty(name)) {
      throw new Error(`Модуль "${name}" не найден среди опубликованных (${Object.keys(this.modules).join()})`);
    }

    return this.modules[name];
  },

  set(name, module) {
    if (!this.constructor.type(name, this.constructor.TYPE_STRING)) {
      throw new Error(`Неправильное имя модуля ${name}`);
    }

    if (!this.constructor.type(module, this.constructor.TYPE_MODULE)) {
      throw new Error(`Не является модулем ${this.constructor.type(module)}`);
    }

    if (this.modules.hasOwnProperty(name)) {
      throw new Error(`Модуль с имененм ${name} уже был опубликован ранее (${Object.keys(this.modules).join()})`);
    }

    this.modules[name] = module;
  }
});

module.exports = Module;