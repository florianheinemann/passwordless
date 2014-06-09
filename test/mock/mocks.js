'use strict';

function Mocks() {
	this.delivered = [];
	this.userDb = [
		{id: 101, email: 'marc@example.com', phone: '+1-555-555-5555'},
		{id: 103, email: 'alice@example.com', phone: '+1-777-777-7777'}
	];
}

Mocks.prototype.deliveryMockSend = function(name) {
	var self = this;
	return function(tokenToSend, uid, done) {
			setTimeout(function() {
				if(uid === 107) {
					return done('error');
				}

				self.delivered.push({ token: tokenToSend, user: uid, delivery: name });
				done();
			}, 0);
		}
	}



Mocks.prototype.getUserId = function() {
	var self = this;
	return function(user, delivery, callback) {
		setTimeout(function() {
			if(user === 'error') {
				// For unit test purposes
				return callback('Some error', null);
			}
			for (var i=0, item; item = self.userDb[i++];) {
				if((!delivery || delivery === 'sms') && item.phone === user) {
					return callback(null, item.id);
				} else if(item.email === user) {
					return callback(null, item.id);
				}
			};
			callback(null, null);
		}, 0);
	};
}

Mocks.prototype.marc = function() {
	return this.userDb[0];
}

Mocks.prototype.alice = function() {
	return this.userDb[1];
}

module.exports = Mocks;