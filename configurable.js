
class Configurable {
  constructor(config) {
    this.configure(config);
  }

  configure(config) {
    if (typeof config === 'object' && config) {
      for (let name in config) {
        if (config.hasOwnProperty(name)) {
          this[name] = config[name];
        }
      }
    }
  }
}

module.exports = Configurable;