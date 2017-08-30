
class Configurable {

  static get TYPE_OBJECT() { return 0b00000000001; }
  static get TYPE_ARRAY() { return 0b00000000010; }
  static get TYPE_NULL() { return 0b00000000100; }
  static get TYPE_NUMBER() { return 0b00000001000; }
  static get TYPE_REGEXP() { return 0b00000010000; }
  static get TYPE_BOOLEAN() { return 0b00000100000; }
  static get TYPE_FUNCTION() { return 0b00001000000; }
  static get TYPE_STRING() { return 0b00010000000; }
  static get TYPE_UNDEFINED() { return 0b00100000000; }
  static get TYPE_PROMISE() { return 0b01000000000; }
  static get TYPE_ALL() { return 0b11111111111; }

  static type(some, mask) {
    let type = typeof some,
        bin = 0;

    switch (type) {
      case 'number':
        bin = this.TYPE_NUMBER;
        break;
      case 'string':
        bin = this.TYPE_STRING;
        break;
      case 'boolean':
        bin = this.TYPE_BOOLEAN;
        break;
      case 'function':
        if (some instanceof Promise) {
          bin = this.TYPE_PROMISE;
          type = 'promise';
        } else {
          bin = this.TYPE_FUNCTION;
        }
        break;
      case 'undefined':
        bin = this.TYPE_UNDEFINED;
        break;
      case 'object':
        if (Array.isArray(some)) {
          bin = this.TYPE_ARRAY;
          type = 'array';
        } else if (some === null) {
          bin = this.TYPE_NULL;
          type = 'null';
        } else if (some instanceof RegExp) {
          bin = this.TYPE_REGEXP;
          type = 'regexp';
        } else {
          bin = this.TYPE_OBJECT;
        }
        break;
    }

    return typeof mask === 'number' ? (bin & mask) === bin : type;
  }

  static combine_diff(someType1, someType2) {
    return someType1;
  }

  static combine_object(target, source, combiners) {
    for (let name in source) {
      if (source.hasOwnProperty(name)) {
        if (target.hasOwnProperty(name)) {
          target[name] = this.combine(target[name], [source[name]], combiners);
        } else {
          target[name] = source[name];
        }
      }
    }

    return target;
  }

  static combine_array(target, source) {
    target.splice.apply(target, [0, target.length].concat(source));
    return target;
  }

  static combine_null(target, source) {
    return source;
  }

  static combine_number(target, source) {
    return source;
  }

  static combine_regexp(target, source) {
    return source;
  }

  static combine_boolean(target, source) {
    return source;
  }

  static combine_function(target, source) {
    return source;
  }

  static combine_string(target, source) {
    return source;
  }

  static combine_undefined(target, source) {
    return source
  }

  static combine_promise(target, source) {
    return Promise.all([target, source]);
  }

  static combine(target, sources, combiners = {}) {
    let targetType = this.type(target),
        combineType = `combine_${targetType}`,
        combineFunction = combiners[combineType] || this[combineType];

    sources = sources.slice(0);

    while (sources.length) {
      let source = sources.shift(),
          sourceType = this.type(source);

      if (targetType === sourceType) {
        if (this.type(combineFunction, this.TYPE_FUNCTION)) {
          target = combineFunction.call(this, target, source, combiners);
        }
      } else {
        target = this.combine_diff(target, source, combiners);
      }
    }

    return target;
  }

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