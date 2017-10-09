const Configurable = require('./configurable');

/**
 * @typedef {Object} Config
 * @property {String} __filename
 * @property {String} __inject
 * @property {String} __define
 * @property {String|Object} __basename
 * @property {Config[]} modules
 */

/**
 * Модуль
 */
class Module extends Configurable {

  /**
   * Создаст экземпляр класса указанного в конфигурации или класса Module
   * @param {Config} config
   * @returns {Module}
   */
  static init(config) {

    if (config.hasOwnProperty('__inject')) {
      return this.scope[config.__inject];
    }

    let Class = this;

    if (config.hasOwnProperty('__filename')) {
      Class = require(config.__filename);
    }

    return new Class(config);
  }

  /**
   * Конструктор модуля
   * определит конфигурацию модуля, проинициализирует подмодули
   * и вызовет метод initialize()
   * @param {Config} config
   */
  constructor(config = {}) {
    super(config);

    let publish = function(name, value){
      if (this.hasOwnProperty(name)) {
        throw new Error(`Не удаётся переопределить свойство базового модуля`);
      }
      this[name] = value;
    }.bind(this);

    this.onInitialized = this.constructor
      .queue(this.modules || [], (config) => {
        let module = this.constructor.init(config);

        return module.onInitialized
          .then(() => {
            if (config.hasOwnProperty('__basename') || module.hasOwnProperty('__basename')) {
              let basename = config.__basename || module.__basename;

              if (typeof basename === 'function') {
                if (!basename.name) {
                  throw new Error(`Не удалось определить имя функции указанной в опции __basename модуля ${module.constructor.name}`);
                }

                let value = basename(module);

                if (value instanceof Promise) {
                  return value.then((value) => {
                    publish(basename.name, value);
                  })
                }

                publish(basename, value);

              } else if (typeof basename === 'string') {
                publish(basename, module);
              } else if (typeof basename === 'object') {

                return this.constructor.queue(Object.keys(basename), (key) => {
                  let value = basename[key];

                  if (typeof value === 'string') {
                    if (!module.hasOwnProperty(value)) {
                      throw new Error(`У модуля ${module.constructor.name} отсутствует публикуемое свойство ${value}`);
                    }

                    if (typeof module[value] === 'function') {
                      value = module[value].bind(module);
                    } else {
                      value = module[value];
                    }

                    publish(key, value);
                  } else if (typeof value === 'function') {
                    value = value(module);

                    if (value instanceof Promise) {
                      return value.then((value) => publish(key, value));
                    }

                    publish(key, value);
                  }
                });

              } else {
                throw new Error(`Неправильный формат опции __basename (${typeof basename})`);
              }
            }
          });
      })
      .then(() => {
        if (config.hasOwnProperty('__define')) {
          if (this.constructor.scope.hasOwnProperty(config.__define)) {
            throw new Error(`Попытка переопределить ранее опубликованный в scope модуль модулем ${module.constructor.name} (${config.__define})`);
          }

          this.constructor.scope[config.__define] = this;
        }
      })
      .then(() => this.initialize())
      .catch((error) => console.error(error));
  }

  configure(config) {
    if (this.constructor.hasOwnProperty('defaults')) {
      config = this.constructor.combine({}, [this.constructor.defaults, config]);
    }

    super.configure(config);
  }

  initialize() {
  }
}

Module.scope = {};

module.exports = Module;
