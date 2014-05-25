'use strict';

var url = require('url');
var uuid = require('node-uuid');
var TokenStore = require('../TokenStore/tokenstore');

/**
 * Passwordless
 * @param {TokenStore} Instance of a TokenStore, which stores created tokens
 * @param {object} Optional. { userProperty: 'user' } allows to set the property
 * name under which the user is stored in the http request object. Default is 'user'
 * @constructor
 */
function Passwordless(tokenStore, options) {
	options = options || {};
	if(!(tokenStore instanceof TokenStore)) {
		throw new Error('tokenStore has to be an instance of TokenStore')
	}
	this._tokenStore = tokenStore;
	this._userProperty = (options.userProperty) ? options.userProperty : 'user';
	this._deliveryMethods = {};
	this._defaultDelivery = undefined;
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

/**
 * Logs the current user out and destroys the session information about this user
 * @return {function} middleware
 */
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

/**
 * By adding this middleware function to a route, Passwordless automatically restores
 * the logged in user from the session. In 90% of the cases, this is what is required. 
 * However, Passwordless can also work without session support in a stateless mode.
 *
 * @example
 * 		var app = express();
 * 		var passwordless = new Passwordless(new TokenStoreMock());
 * 		
 * 		app.use(cookieParser());
 * 		app.use(expressSession({ secret: '42' }));
 * 		
 * 		app.use(passwordless.sessionSupport());
 * 		app.use(passwordless.acceptToken());
 *
 * @return {function} middleware
 */
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

Passwordless.prototype.requestToken = function(options) {
	var self = this;
	options = options || {};
	return function(req, res, next) {
		var sendError = function() {
			if(options.failureRedirect) {
				res.redirect(options.failureRedirect);
			} else {
				res.send(403);
			}
		}

		// Todo: flash

		if(!req.body) {
			throw new Error('req.body does not exist: did you provide a body parser middleware before calling acceptToken?')
		} 

		var input = (options.input) ? options.input : 'email';
		var contact = req.body[input];
		if(!contact) {
			return sendError()
		}

		self._defaultDelivery.verifyUser(contact, function(error, uid) {
			if(error) {
				next('Error on the deliveryMethod verification layer: ' + error);
			} else if(uid) {
				// Todo: store
				self._defaultDelivery.sendToken(uuid.v4(), uid, function(error) {
					if(!error) {
						next();
					} else {
						next('Error on the deliveryMethod delivery layer: ' + error);
					}
				})
			} else {
				sendError();
			}
		})
	}
}

Passwordless.prototype.add = function(name, verifyUser, sendToken) {
	// So that add can be called with (verifyUser, sendToken)
	var defaultUsage = false;
	if(!sendToken && verifyUser) {
		sendToken = verifyUser;
		verifyUser = name;
		name = undefined;
		defaultUsage = true;
	}

	if(typeof verifyUser !== 'function' || typeof sendToken !== 'function' || (name && typeof name !== 'string')) {
		throw new Error('Passwordless.add called with wrong parameters');
	} else if(this._defaultDelivery) {
		throw new Error('Only one default delivery method shall be defined and not be mixed up with named methods. Use named delivery methods instead')
	} else if(defaultUsage && Object.keys(this._deliveryMethods).length > 0) {
		throw new Error('Default delivery methods and named delivery methods shall not be mixed up');
	}

	var method = {
			verifyUser: verifyUser,
			sendToken: sendToken
		};
	if(defaultUsage) {
		this._defaultDelivery = method;
	} else {
		if(this._deliveryMethods[name]) {
			throw new Error('Only one named delivery method with the same name shall be added')
		} else {
			this._deliveryMethods[name] = method;
		}
	}
}

module.exports = Passwordless;