'use strict';

var url = require('url');
var AuthDataStore = require('./authdatastore');

function Passwordless(dataStore) {
	if(!(dataStore instanceof AuthDataStore)) {
		throw new Error('dataStore has to be an instance of AuthDataStore')
	}
	this._dataStore = dataStore;
}

Passwordless.prototype.authenticate = function(options) {
	var self = this;
	return function(req, res, next) {
		options = options || {};

		if(req.session && req.session.passwordless) {
			return next();
		}

		if(req.query.token) {
			var token = req.query.token;
			if(self._dataStore) {
				self._dataStore.authenticate(token, function(error, uid, referrer) {
					if(uid) {
						if(req.session) {
							req.session.passwordless = uid;
						}
						return next();
					} else if(error) {
						throw new Error(error);
					} else {
						authenticationError();
					}
				});
			} else {
				authenticationError();
			}
		} else {
			authenticationError();
		}

		function authenticationError() {
			if(options.notAuthRedirect) {
				var queryParam = '';
				if(options.originUrlParam){
					var parsedRedirectUrl = url.parse(options.notAuthRedirect), queryParam = '?';
					if(parsedRedirectUrl.query) {
						queryParam = '&';
					}
					queryParam += options.originUrlParam + '=' + encodeURIComponent(req.originalUrl);
				}

				res.redirect(options.notAuthRedirect + queryParam);
			} else {
				res.send(403);
			}
		}
	}
};

Passwordless.prototype.logout = function() {
	return function(req, res, next) {
		if(req.session && req.session.passwordless) {
			req.session.passwordless = undefined;
		}
		next();
	}
};

module.exports = Passwordless;