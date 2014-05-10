'use strict';

function AuthDataStore() {

}

AuthDataStore.prototype.authenticate = function(hashedToken, callback) {
	throw new Error('AuthDataStore shall never be called in its abstract form');
}

module.exports = AuthDataStore;