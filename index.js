#!/usr/bin/env node

let config = {};

if (typeof process.argv[2] === 'string') {
  config = require(process.argv.splice(2, 1)[0]);
}

module.exports = require('./module').init(config);
