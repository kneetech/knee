const Configurable = require('configurable');

const scope = {};

function getFromScope(name) {
  if (!scope.hasOwnProperty(name)) {
    throw new Error(`Модуль "${name}" не найден среди опубликованных (${Object.keys(scope).join()})`);
  }

  return scope[name];
}

function setToScope(name, instance) {
  if (scope.hasOwnProperty(name)) {
    throw new Error(`Модуль с имененм ${name} уже был опубликован ранее (${Object.keys(scope).join()})`);
  }

  return scope[name] = instance;
}

function loadModules(module) {
  if (module.hasOwnProperty('modules')) {
    return Configurable.queue(module.modules, (config) => loadModule(module, config));
  }
}

function loadModule(module, config) {

  if (config.hasOwnProperty('__inject')) {
    let submodule = getFromScope(config.__inject);

    if (config.hasOwnProperty('__basename')) {
      mountModule(module, config.__basename, submodule);
    } else if (submodule.hasOwnProperty('__basename')) {
      mountModule(module, submodule.__basename, submodule);
    }
  } else {
    let submodule = Module.init(config);

    if (submodule.hasOwnProperty('__basename')) {
      return submodule.onInitialized
        .then(() => mountModule(module, submodule.__basename, submodule));
    }
  }
}

function mountModule(module, basename, submodule) {
  function set(module, name, value) {
    if (module.hasOwnProperty(name)) {
      throw new Error(`Свойство ${module.constructor.name}.${name} не может быть переопределено`);
    }

    module[name] = value;
  }

  if (typeof basename === 'string') {
    set(module, basename, submodule);
  } else {
    return Configurable.queue(Object.keys(basename), (key) => {
      let value = basename[key];

      if (typeof value === 'function') {
        value = value(submodule);

        if (value instanceof Promise) {
          return value.then((value) => {
            set(module, key, value);
          });
        }

      } else if (typeof value === 'string') {
        if (!submodule.hasOwnProperty(value)) {
          throw new Error(`Модуль не имеет свойства ${submodule.constructor.name}.${value} указанного в __basename`);
        }

        if (typeof submodule[value] === 'function') {
          value = submodule[value].bind(submodule);
        } else {
          value = submodule[value];
        }
      } else {
        throw new Error(`Неправильный форма __basename`);
      }

      set(module, key, value);
    });
  }
}

class Module extends Configurable {

  static init(config) {

    let Class = this;

    if (config.hasOwnProperty('__filename')) {
      Class = require(config.__filename);
    }

    if (Class.hasOwnProperty('defaults')) {
      config = this.combine(config, [Class.defaults]);
    }

    return new Class(config);
  }

  configure(config = {}) {

    if (this.constructor.hasOwnProperty('defaults')) {
      config = this.constructor.combine({}, [this.constructor.defaults, config]);
    }

    super.configure(config);

    if (config && config.hasOwnProperty('__define')) {
      setToScope(config.__define, this);
    }

    this.onInitialized = Promise.resolve()
      .then(() => loadModules(this))
      .then(() => this.initialize())
      .catch((error) => console.error(error));
  }

  initialize() {

  }

}

module.exports = Module;
