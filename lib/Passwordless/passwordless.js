'use strict';

var url = require('url');
var TokenStore = require('../TokenStore/tokenstore');

function Passwordless(tokenStore, options) {
	options = options || {};
	if(!(tokenStore instanceof TokenStore)) {
		throw new Error('tokenStore has to be an instance of TokenStore')
	}
	this._tokenStore = tokenStore;
	this._userProperty = (options.userProperty) ? options.userProperty : 'user';
}

Passwordless.prototype.acceptToken = function(options) {
	var self = this;
	options = options || {};
	return function(req, res, next) {
		var token = req.query.token;
		if(!token && options.allowPost) {
			if(!req.body) {
				throw new Error('req.body does not exist: did you provide a body parser middleware before calling acceptToken?')
			} else if(req.body.token) {
				token = req.body.token;
			}
		} else if (!token && options.allowParam && req.params.token) {
			token = req.params.token;
		}

		if(token) {
			if(self._tokenStore) {
				self._tokenStore.authenticate(token, function(error, uid, referrer) {
					if(uid) {
						req[self._userProperty] = uid;
						if(req.session) {
							req.session.passwordless = req[self._userProperty];
						}
					} else if(error) {
						throw new Error(error);
					} else if(options.flashInvalidToken) {
						if(!req.flash) {
							throw new Error('To use flashInvalidToken, flash middleware is requied such as connect-flash');
						} else {
							req.flash('passwordless', options.flashInvalidToken);
						}
					}
				});
			} else {
				throw new Error('No TokenStore supplied');
			}
		}
		next();
	}
}

Passwordless.prototype.restricted = function(options) {
	var self = this;
	return function(req, res, next) {
		if(req[self._userProperty]) {
			return next();
		}

		// not authorized
		options = options || {};
		if(options.notAuthRedirect) {
			var queryParam = '';
			if(options.originUrlParam){
				var parsedRedirectUrl = url.parse(options.notAuthRedirect), queryParam = '?';
				if(parsedRedirectUrl.query) {
					queryParam = '&';
				}
				queryParam += options.originUrlParam + '=' + encodeURIComponent(req.originalUrl);
			}

			if(options.flashUserNotAuth) {
				if(!req.flash) {
					throw new Error('To use flashUserNotAuth, flash middleware is requied such as connect-flash');
				} else {
					req.flash('passwordless', options.flashUserNotAuth);
				}
			}	

			res.redirect(options.notAuthRedirect + queryParam);
		} else if(options.flashUserNotAuth) {
			throw new Error('flashUserNotAuth cannot be used without notAuthRedirect');
		} else {
			res.send(403);
		}
	}
}

Passwordless.prototype.logout = function() {
	var self = this;
	return function(req, res, next) {
		if(req.session && req.session.passwordless) {
			delete req.session.passwordless;
		}
		if(req[self._userProperty]) {
			delete req[self._userProperty];
		}
		next();
	}
}

Passwordless.prototype.sessionSupport = function() {
	var self = this;
	return function(req, res, next) {
		if(!req.session) {
			throw new Error('sessionSupport requires session middleware such as expressSession');
		} else if (req.session.passwordless) {
			req[self._userProperty] = req.session.passwordless;
		}
		next();
	}
}

module.exports = Passwordless;