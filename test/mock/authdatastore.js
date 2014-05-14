'use strict';

var util = require('util');
var AuthDataStore = require('../../lib/authdatastore');

function AuthDataStoreMock() {
	AuthDataStore.call(this);
	this._invalidated = false;
}

util.inherits(AuthDataStoreMock, AuthDataStore);

AuthDataStoreMock.prototype.authenticate = function(hashedToken, callback) {
	if(hashedToken === 'invalid' || this._invalidated) {
		callback(null, false, null);
	} else if (hashedToken === 'valid') {
		this._invalidated = true;
		callback(null, 'mail@example.com', null);
	} else if(hashedToken === 'error') {
		callback('Unknown error', null, null);
	}
};

module.exports = AuthDataStoreMock;
