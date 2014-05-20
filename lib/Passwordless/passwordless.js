'use strict';

var url = require('url');
var TokenStore = require('../TokenStore/tokenstore');

function Passwordless(tokenStore) {
	if(!(tokenStore instanceof TokenStore)) {
		throw new Error('tokenStore has to be an instance of TokenStore')
	}
	this._tokenStore = tokenStore;
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
			if(self._tokenStore) {
				self._tokenStore.authenticate(token, function(error, uid, referrer) {
					if(uid) {
						req.user = uid;
						if(req.session) {
							req.session.passwordless = req.user;
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
			delete req.session.passwordless;
		}
		delete req.user;
		next();
	}
};

Passwordless.prototype.sessionSupport = function() {
	return function(req, res, next) {
		if(req.session && req.session.passwordless) {
			req.user = req.session.passwordless;
		}
		next();
	}
}

module.exports = Passwordless;