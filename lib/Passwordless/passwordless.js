'use strict';

var url = require('url');
var uuid = require('node-uuid');

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
	if(!tokenStore) {
		throw new Error('tokenStore has to be provided')
	}

	this._tokenStore = tokenStore;
	this._userProperty = (options.userProperty) ? options.userProperty : 'user';
}

Passwordless.prototype.acceptToken = function(options) {
	var self = this;
	options = options || {};
	return function(req, res, next) {
		if(!self._tokenStore) {
			throw new Error('Passwordless is missing a TokenStore. Are you sure you called passwordless.init()?');
		}

		var tokenField = (options.tokenField) ? options.tokenField : 'token';
		var uidField = (options.uidField) ? options.uidField : 'uid';

		var token = req.query[tokenField], uid = req.query[uidField];
		if(!token && !uid && options.allowPost) {
			if(!req.body) {
				throw new Error('req.body does not exist: did you provide a body parser middleware before calling acceptToken?')
			} else if(req.body[tokenField] && req.body[uidField]) {
				token = req.body[tokenField];
				uid = req.body[uidField];
			}
		}

		if(options.flashInvalidToken && !req.flash) {
			throw new Error('To use flashInvalidToken, flash middleware is required such as connect-flash');
		}

		if(token && uid) {
			self._tokenStore.authenticate(token, uid, function(error, valid, referrer) {
				if(valid) {
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
		if(options.failureRedirect) {
			var queryParam = '';
			if(options.originField){
				var parsedRedirectUrl = url.parse(options.failureRedirect), queryParam = '?';
				if(parsedRedirectUrl.query) {
					queryParam = '&';
				}
				queryParam += options.originField + '=' + encodeURIComponent(req.originalUrl);
			}

			if(options.failureFlash) {
				if(!req.flash) {
					throw new Error('To use failureFlash, flash middleware is requied such as connect-flash');
				} else {
					req.flash('passwordless', options.failureFlash);
				}
			}	

			res.redirect(options.failureRedirect + queryParam);
		} else if(options.failureFlash) {
			throw new Error('failureFlash cannot be used without failureRedirect');
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
			self._tokenStore.invalidateUser(req[self._userProperty], function() {});
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

Passwordless.prototype.requestToken = function(getUserID, options) {
	var self = this;
	options = options || {};
	
	return function(req, res, next) {
		var sendError = function(statusCode, authenticate) {
			if(options.failureRedirect) {
				if(options.failureFlash) {
					req.flash('passwordless', options.failureFlash);
				}
				res.redirect(options.failureRedirect);
			} else {
				if(statusCode === 401) {
					self._send401(res, authenticate)
				} else {
					res.send(statusCode);
				}
			}
		}

		if(!self._tokenStore) {
			throw new Error('Passwordless is missing a TokenStore. Are you sure you called passwordless.init()?');
		}

		if(!req.body && !options.allowGet) {
			throw new Error('req.body does not exist: did you provide a body parser middleware before calling acceptToken?')
		} else if(!self._defaultDelivery && Object.keys(self._deliveryMethods).length === 0) {
			throw new Error('passwordless requires at least one delivery method which can be added using passwordless.add()');
		} else if(options.failureFlash && !req.flash) {
			throw new Error('To use failureFlash, flash middleware is required such as connect-flash');
		} else if(options.failureFlash && !options.failureRedirect) {
			throw new Error('failureFlash cannot be used without failureRedirect');
		}

		var userField = (options.userField) ? options.userField : 'user';
		var deliveryField = (options.deliveryField) ? options.deliveryField : 'delivery';

		var user, delivery;
		if(req.body) {
			user = req.body[userField];
			delivery = req.body[deliveryField];
		} else if(options.allowGet) {
			user = req.query[userField];
			delivery = req.query[deliveryField];
		}

		var deliveryMethod = self._defaultDelivery;
		if(delivery && self._deliveryMethods[delivery]) {
			deliveryMethod = self._deliveryMethods[delivery];
		}

		if(typeof user === 'string' && user.length === 0) {
			return sendError(401, 'Provide a valid user');
		} else if(!deliveryMethod || !user) {
			return sendError(400);
		}

		getUserID(user, delivery, function(uidError, uid) {
			if(uidError) {
				next(new Error('Error on the user verification layer: ' + uidError));
			} else if(uid) {
				var token = (deliveryMethod.options.tokenAlgorithm || uuid.v4)();
				var ttl = deliveryMethod.options.ttl || 60 * 60 * 1000;

				self._tokenStore.storeOrUpdate(token, uid, ttl, null, function(storeError) {
					if(storeError) {
						next(new Error('Error on the storage layer: ' + storeError));
					} else {
						deliveryMethod.sendToken(token, uid, function(deliveryError) {
							if(deliveryError) {
								next(new Error('Error on the deliveryMethod delivery layer: ' + deliveryError));
							} else {
								if(!req.passwordless) {
									req.passwordless = {};
								}
								req.passwordless.uidToAuth = uid;
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

Passwordless.prototype.addDelivery = function(name, sendToken, options) {
	// So that add can be called with (sendToken [, options])
	var defaultUsage = false;
	if(typeof name === 'function') {
		options = sendToken;
		sendToken = name;
		name = undefined;
		defaultUsage = true;
	}
	options = options || {};

	if(typeof sendToken !== 'function' || typeof options !== 'object' 
		|| (name && typeof name !== 'string')) {
		throw new Error('Passwordless.addDelivery called with wrong parameters');
	} else if((options.ttl && typeof options.ttl !== 'number') || 
		(options.tokenAlgorithm && typeof options.tokenAlgorithm !== 'function')) {
		throw new Error('One of the provided options is of the wrong format');
	} else if(this._defaultDelivery) {
		throw new Error('Only one default delivery method shall be defined and not be mixed up with named methods. Use named delivery methods instead')
	} else if(defaultUsage && Object.keys(this._deliveryMethods).length > 0) {
		throw new Error('Default delivery methods and named delivery methods shall not be mixed up');
	}

	var method = {
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