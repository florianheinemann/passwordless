'use strict';

var util = require('util');
var TokenStore = require('../../lib').TokenStore;

function TokenStoreMock() {
	TokenStore.call(this);
	this.records = [];
}

util.inherits(TokenStoreMock, TokenStore);

TokenStoreMock.prototype.authenticate = function(hashedToken, callback) {
	// setTimeout to validate that async operation works
	var self = this;
	setTimeout(function() {
		for (var i = self.records.length - 1; i >= 0; i--) {
			if(self.records[i].hashedToken === hashedToken) {
				if(self.records[i].validTill >= Date.now()) {
					return callback(null, self.records[i].uid, self.records[i].origin);
				}
			}
		};
		callback(null, false);		
	}, 0)
};

TokenStoreMock.prototype.store = function(hashedToken, uid, msToLive, originUrl, callback) {
	// setTimeout to validate that async operation works
	var self = this;
	setTimeout(function() { 
		self.records.push(new Record(uid, hashedToken, Date.now() + msToLive, originUrl))
		callback();
	}, 0)
}

function Record(uid, hashedToken, validTill, origin) {
	this.uid = uid;
	this.hashedToken = hashedToken;
	this.validTill = validTill;
	this.origin = origin;
}

module.exports = TokenStoreMock;
