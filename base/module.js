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

    this.onConfigured = Promise.resolve()
        .then(() => delete this.onConfigured)
        .then(() => this.loadComponents())
        .then(() => this.loadModules())
        .then(() => this.initialize())
        .catch((error) => console.error(error));
  }

  initialize() {

  }

  static create(config) {
    let Class = Module;

    if (config.hasOwnProperty('__filename')) {
      Class = require(config.__filename);
    }

    return new Class(config);
  }

  loadComponents() {
    if (this.hasOwnProperty('components')) {
      console.log('Загрузка компонентов');
      return utils.queue(this.components, (component, name) => {

        if (this.hasOwnProperty(name)) {
          throw new Error('Имя уже занято');
        }

        console.log(`Загрузка компоненты ${name}`);

        let instance = this[name] = Module.create(component);

        return instance.onConfigured;
      });
    }
  }

  loadModules() {
    if (this.hasOwnProperty('modules')) {
      console.log('Загрузка модулей');
      return utils.queue(this.modules, (module) => {
        console.log(`Загрузка модуля ${module.__filename}`);
        return Module.create(module).onConfigured;
      });
    }
  }
}

module.exports = Module;