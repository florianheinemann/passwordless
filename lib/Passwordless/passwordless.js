'use strict';

var url = require('url');
var uuid = require('node-uuid');
var TokenStore = require('../tokenstore/tokenstore');

/**
 * Passwordless
 * @constructor
 */
function Passwordless(tokenStore, options) {
	this._tokenStore = undefined;
	this._userProperty = undefined;
	this._deliveryMethods = {};
	this._defaultDelivery = undefined;
}

/**
 * Initializes Passwordless and is mandatory to be called
 * @param  {TokenStore} An instance of a TokenStore
 * @param {object} Optional. Various options as object: { option1: value, 
 * option2: value, ...}. { userProperty: 'user' } allows to set the property 
 * name under which the user is stored in the http request object (default 
 * is 'user')
 * @return No return value
 */
Passwordless.prototype.init = function(tokenStore, options) {
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
	if(!this._tokenStore) {
		throw new Error('Passwordless is missing a TokenStore. Are you sure you called passwordless.init()?');
	}
	
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

		if(options.flashInvalidToken && !req.flash) {
			throw new new Error('To use flashInvalidToken, flash middleware is required such as connect-flash');
		}

		if(token) {
			self._tokenStore.authenticate(token, function(error, uid, referrer) {
				if(uid) {
					req[self._userProperty] = uid;
					if(req.session) {
						req.session.passwordless = req[self._userProperty];
					}
				} else if(error) {
					return next(new Error('TokenStore.authenticate() error: ' + error));
				} else if(options.flashInvalidToken) {
					req.flash('passwordless', options.flashInvalidToken);
				}
				next();
			});
		} else {
			next();
		}
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
			self._send401(res, 'Provide a token');
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
 * 		var passwordless = new Passwordless(new DBTokenStore());
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
	if(!this._tokenStore) {
		throw new Error('Passwordless is missing a TokenStore. Are you sure you called passwordless.init()?');
	}
	
	return function(req, res, next) {
		var sendError = function(statusCode, authenticate) {
			if(options.unknownUserRedirect) {
				if(options.unknownUserFlash) {
					req.flash('passwordless', options.unknownUserFlash);
				}
				res.redirect(options.unknownUserRedirect);
			} else {
				if(statusCode === 401) {
					self._send401(res, authenticate)
				} else {
					res.send(statusCode);
				}
			}
		}

		if(!req.body && !options.allowGet) {
			throw new Error('req.body does not exist: did you provide a body parser middleware before calling acceptToken?')
		} else if(!self._defaultDelivery && Object.keys(self._deliveryMethods).length === 0) {
			throw new Error('passwordless requires at least one delivery method which can be added using passwordless.add()');
		} else if(options.unknownUserFlash && !req.flash) {
			throw new Error('To use unknownUserFlash, flash middleware is required such as connect-flash');
		} else if(options.unknownUserFlash && !options.unknownUserRedirect) {
			throw new Error('unknownUserFlash cannot be used without unknownUserRedirect');
		}

		var input = (options.input) ? options.input : 'email';
		var strategy = (options.strategy) ? options.strategy : 'strategy';

		var contact, delivery;
		if(req.body) {
			contact = req.body[input];
			delivery = req.body[strategy];
		} else if(options.allowGet) {
			contact = req.query[input];
			delivery = req.query[strategy];
		}

		var deliveryMethod = self._defaultDelivery;
		if(delivery && self._deliveryMethods[delivery]) {
			deliveryMethod = self._deliveryMethods[delivery];
		}

		if(typeof contact === 'string' && contact.length === 0) {
			return sendError(401, 'Provide a valid user');
		} else if(!deliveryMethod || !contact) {
			return sendError(400);
		}

		deliveryMethod.verifyUser(contact, function(verifyError, uid) {
			if(verifyError) {
				next(new Error('Error on the deliveryMethod verification layer: ' + verifyError));
			} else if(uid) {
				var token = (deliveryMethod.options.tokenAlgorithm || uuid.v4)();
				var ttl = deliveryMethod.options.ttl || 60 * 60 * 1000;

				self._tokenStore.store(token, uid, ttl, null, function(storeError) {
					if(storeError) {
						next(new Error('Error on the storage layer: ' + storeError));
					} else {
						deliveryMethod.sendToken(token, uid, function(deliveryError) {
							if(deliveryError) {
								next(new Error('Error on the deliveryMethod delivery layer: ' + deliveryError));
							} else {
								next();
							}
						})		
					}	
				});
			} else {
				sendError(401, 'Provide a valid user');
			}
		})
	}
}

Passwordless.prototype.add = function(name, verifyUser, sendToken, options) {
	// So that add can be called with (verifyUser, sendToken [, options])
	var defaultUsage = false;
	if(typeof name === 'function') {
		options = sendToken;
		sendToken = verifyUser;
		verifyUser = name;
		name = undefined;
		defaultUsage = true;
	}
	options = options || {};

	if(typeof verifyUser !== 'function' || typeof sendToken !== 'function' || typeof options !== 'object' 
		|| (name && typeof name !== 'string')) {
		throw new Error('Passwordless.add called with wrong parameters');
	} else if((options.ttl && typeof options.ttl !== 'number') || 
		(options.tokenAlgorithm && typeof options.tokenAlgorithm !== 'function')) {
		throw new Error('One of the provided options is of the wrong format');
	} else if(this._defaultDelivery) {
		throw new Error('Only one default delivery method shall be defined and not be mixed up with named methods. Use named delivery methods instead')
	} else if(defaultUsage && Object.keys(this._deliveryMethods).length > 0) {
		throw new Error('Default delivery methods and named delivery methods shall not be mixed up');
	}

	var method = {
			verifyUser: verifyUser,
			sendToken: sendToken,
			options: options
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

Passwordless.prototype._send401 = function(res, authenticate) {
	res.statusCode = 401;
	if(authenticate) {
		res.setHeader('WWW-Authenticate', authenticate);
	}
	res.end('Unauthorized');
}

module.exports = Passwordless;