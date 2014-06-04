'use strict';

function TokenStore() {

}

TokenStore.prototype.authenticate = function(hashedToken, callback) {
	throw new Error('TokenStore shall never be called in its abstract form');
}

TokenStore.prototype.store = function(hashedToken, uid, msToLive, originUrl, callback) {
	throw new Error('TokenStore shall never be called in its abstract form');
}

TokenStore.prototype.length = function(callback) {
	throw new Error('TokenStore shall never be called in its abstract form');
}

module.exports = TokenStore;