'use strict';

var Passwordless = require('./Passwordless/passwordless');

module.exports = new Passwordless();
module.exports.Passwordless = Passwordless;
module.exports.TokenStore = require('./TokenStore/tokenstore');