'use strict';

var util = require('util');
var TokenStore = require('../../lib').TokenStore;

function TokenStoreMockAuthOnly(infiniteValidity, onStore) {
	TokenStore.call(this);
	this._infiniteValidity = infiniteValidity || false;
	this._users = [];
	this._onStore = onStore || function() {};
}

util.inherits(TokenStoreMockAuthOnly, TokenStore);

TokenStoreMockAuthOnly.prototype.authenticate = function(hashedToken, callback) {

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

	setTimeout(function() {
		if(hashedToken === 'invalid' || isInvalidated()) {
			callback(null, false, null);
		} else if(hashedToken === 'error') {
			callback('Unknown error', null, null);
		} else {
			// everything else is a valid token
			if(!self._infiniteValidity) {
				invalidate();
			}

			if(isNewUser()) {
				self._users.push({
					user: hashedToken,
					invalidated: false
				});
			}

			callback(null, hashedToken + '@example.com', null);		
		}
	} , 0)
};

TokenStoreMockAuthOnly.prototype.store = function(hashedToken, uid, msToLive, originUrl, callback) {
	var self = this;
	setTimeout(function() {
		self._onStore(hashedToken);
		callback();
	}, 0)
}

module.exports = TokenStoreMockAuthOnly;
