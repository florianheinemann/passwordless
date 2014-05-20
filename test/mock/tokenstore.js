'use strict';

var util = require('util');
var TokenStore = require('../../lib').TokenStore;

function TokenStoreMock(infiniteValidity) {
	TokenStore.call(this);
	this._infiniteValidity = infiniteValidity || false;
	this._users = [];
}

util.inherits(TokenStoreMock, TokenStore);

TokenStoreMock.prototype.authenticate = function(hashedToken, callback) {

	var self = this;
	var isNewUser = function() {
		for (var i = self._users.length - 1; i >= 0; i--) {
			if(hashedToken === self._users[i].user)
				return false;
		};
		return true;
	}

	var isInvalidated = function() {
		for (var i = self._users.length - 1; i >= 0; i--) {
			if(hashedToken === self._users[i].user && self._users[i].invalidated)
				return true;
		};
		return false;
	}

	var invalidate = function() {
		for (var i = self._users.length - 1; i >= 0; i--) {
			if(hashedToken === self._users[i].user)
				self._users[i].invalidated = true;
		};	
	}

	if(hashedToken === 'invalid' || isInvalidated()) {
		callback(null, false, null);
	} else if(hashedToken === 'error') {
		callback('Unknown error', null, null);
	} else {
		// everything else is a valid token
		if(!this._infiniteValidity) {
			invalidate();
		}

		if(isNewUser()) {
			this._users.push({
				user: hashedToken,
				invalidated: false
			});
		}

		callback(null, hashedToken + '@example.com', null);		
	}
};

module.exports = TokenStoreMock;
