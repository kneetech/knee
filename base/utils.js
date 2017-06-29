const Promise = require('bluebird');

module.exports = {
  queue(collection, handler) {

    let index = 0,
        keys = Array.isArray(collection) ? new Array(collection.length) : Object.keys(collection);

    function next() {
      let result,
          key = keys[index] || index;

      if (keys.length > index) {
        result = handler(collection[key], key);

        if (result instanceof Promise === false) {
          result = Promise.resolve(result);
        }

        return result
            .then(function(result){
              if (result != undefined) {
                collection[key] = result;
              }
            })
            .then(function(){ index++; })
            .then(next);
      }

      return Promise.resolve(result);
    }

    return next().then(() => collection);
  }
};
