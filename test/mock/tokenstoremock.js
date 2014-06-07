'use strict';

var util = require('util');
var TokenStore = require('passwordless-tokenstore');

function TokenStoreMock(options) {
	options = options || {};
	TokenStore.call(this);
	this.records = [];
	this.integration = options.integration;
}

util.inherits(TokenStoreMock, TokenStore);

TokenStoreMock.prototype.authenticate = function(token, callback) {
	if(!token || !callback) {
		throw new Error();
	}
	// setTimeout to validate that async operation works
	var self = this;
	setTimeout(function() {
		if(!self.integration && token === 'error') {
			return callback('A mocked error', null, null);
		} else if(!self.integration && token === 'valid') {
			return callback(null, 'valid@example.com', 'http://example.com/path');
		} else if(!self.integration && token === 'alice') {
			return callback(null, 'alice@example.com', 'http://example.com/alice');
		} else if(!self.integration && token === 'marc') {
			return callback(null, 'marc@example.com', 'http://example.com/marc');
		} else if(!self.integration && token === 'invalid') {
			return callback(null, null, null);
		}

		var found = self._findRecord(null, token);

		if(found >= 0 && self.records[found].validTill >= Date.now()) {
			callback(null, self.records[found].uid, self.records[found].origin);
		} else {
			callback(null, null, null);
		}	
	}, 0)
};

TokenStoreMock.prototype.storeOrUpdate = function(token, uid, msToLive, originUrl, callback) {
	if(!token || !uid || !msToLive || !callback) {
		throw new Error();
	}
	// setTimeout to validate that async operation works
	var self = this;
	setTimeout(function() {
		var found = 0;
		var newRecord = new Record(uid, token, Date.now() + msToLive, originUrl);
		if(self._findRecord(null, token) >= 0) {
			return callback('token already exists');
		} else if((found = self._findRecord(uid, null)) >= 0) {
			self.records[found] = newRecord;
		} else {
			self.records.push(newRecord);
		}
		callback();
	}, 0)
}

TokenStoreMock.prototype.remove = function(token, callback) {
	if(!token || !callback) {
		throw new Error();
	}
	// setTimeout to validate that async operation works
	var self = this;
	setTimeout(function() {
		var found = self._findRecord(null, token);
		if(found < 0) {
			callback();
		} else {
			self.records.splice(found, 1);
			callback();
		}
	}, 0)
}

TokenStoreMock.prototype.clear = function(callback) {
	if(!callback) {
		throw new Error();
	}
	// setTimeout to validate that async operation works
	var self = this;
	setTimeout(function() {
		self.records = [];
		callback();
	}, 0)
}

TokenStoreMock.prototype.length = function(callback) {
	if(!callback) {
		throw new Error();
	}
	// setTimeout to validate that async operation works
	var self = this;
	setTimeout(function() {
		callback(null, self.records.length);
	}, 0)
}

TokenStoreMock.prototype._findRecord = function(uid, token) {
	for (var i = this.records.length - 1; i >= 0; i--) {
		var record = this.records[i];
		if((!uid || record.uid === uid) && (!token || token === record.token)) {
			return i;
		}
	};
	return -1;
}

function Record(uid, token, validTill, origin) {
	this.uid = uid;
	this.token = token;
	this.validTill = validTill;
	this.origin = origin;
}

module.exports = TokenStoreMock;
