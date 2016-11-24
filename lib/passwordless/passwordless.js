'use strict';

var url = require('url');
var crypto = require('crypto');
var base58 = require('bs58');

/**
 * Passwordless is a node.js module for express that allows authentication and 
 * authorization without passwords but simply by sending tokens via email or 
 * other means. It utilizes a very similar mechanism as many sites use for 
 * resetting passwords. The module was inspired by Justin Balthrop's article 
 * "Passwords are Obsolete"
 * @constructor
 */
function Passwordless() {
	this._tokenStore = undefined;
	this._userProperty = undefined;
	this._deliveryMethods = {};
	this._defaultDelivery = undefined;
}

/**
 * Initializes Passwordless and has to be called before any methods are called
 * @param {TokenStore} tokenStore - An instance of a TokenStore used to store
 * and authenticate the generated tokens
 * @param {Object} [options]
 * @param {String} [options.userProperty] - Sets the name under which the uid 
 * is stored in the http request object (default: 'user')
 * @param {Boolean} [options.allowTokenReuse] - Defines wether a token may be
 * reused by users. Enabling this option is usually required for stateless
 * operation, but generally not recommended due to the risk that others might
 * have acquired knowledge about the token while in transit (default: false)
 * @param {Boolean} [options.skipForceSessionSave] - Some session middleware
 * (especially cookie-session) does not require (and support) the forced
 * safe of a session. In this case set this option to 'true' (default: false)
 * @throws {Error} Will throw an error if called without an instantiated 
 * TokenStore
 */
Passwordless.prototype.init = function(tokenStore, options) {
	options = options || {};
	if(!tokenStore) {
		throw new Error('tokenStore has to be provided')
	}

	this._tokenStore = tokenStore;
	this._userProperty = (options.userProperty) ? options.userProperty : 'user';
	this._allowTokenReuse = options.allowTokenReuse;
	this._skipForceSessionSave = (options.skipForceSessionSave) ? true : false;
}

/**
 * Returns express middleware which will look for token / UID query parameters and
 * authenticate the user if they are provided and valid. A typical URL that is
 * accepted by acceptToken() does look like this:
 * http://www.example.com?token=TOKEN&uid=UID
 * Simply calls the next middleware in case no token / uid has been submitted or if
 * the supplied token / uid are not valid
 *
 * @example
 * app.use(passwordless.sessionSupport());
 * // Look for tokens in any URL requested from the server
 * app.use(passwordless.acceptToken());
 * 		
 * @param  {Object} [options]
 * @param  {String} [options.successRedirect] - If set, the user will be redirected
 * to the supplied URL in case of a successful authentication. If not set but the 
 * authentication has been successful, the next middleware will be called. This 
 * option is overwritten by option.enableOriginRedirect if set and an origin has 
 * been supplied. It is strongly recommended to set this option to avoid leaking 
 * valid tokens via the HTTP referrer. In case of session-less operation, though, 
 * you might want to ignore this flag for efficient operation (default: null)
 * @param  {String} [options.tokenField] - The query parameter used to submit the
 * token (default: 'token')
 * @param  {String} [options.uidField] - The query parameter used to submit the 
 * user id (default: 'uid')
 * @param  {Boolean} [options.allowPost] - If set, acceptToken() will also look for
 * POST parameters to contain the token and uid (default: false)
 * @param  {String} [options.failureFlash] - The error message to be flashed in case
 * a token and uid were provided but the authentication failed. Using this option
 * requires flash middleware such as connect-flash. The error message will be stored
 * as 'passwordless' (example: 'This token is not valid anymore!', default: null)
 * @param  {String} [options.successFlash] - The success message to be flashed in case
 * the supplied token and uid were accepted. Using this option requires flash middleware 
 * such as connect-flash. The success message will be stored as 'passwordless-success' 
 * (example: 'You are now logged in!', default: null)
 * @param  {Boolean} [options.enableOriginRedirect] - If set to true, the user will
 * be redirected to the URL he originally requested before he was redirected to the 
 * login page. Requires that the URL was stored in the TokenStore when requesting a
 * token through requestToken() (default: false)
 * @return {ExpressMiddleware} Express middleware
 * @throws {Error} Will throw an error if there is no valid TokenStore, if failureFlash
 * or successFlash is used without flash middleware or allowPost is used without body 
 * parser middleware
 */
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
				throw new Error('req.body does not exist: did you require middleware to accept POST data (such as body-parser) before calling acceptToken?')
			} else if(req.body[tokenField] && req.body[uidField]) {
				token = req.body[tokenField];
				uid = req.body[uidField];
			}
		}

		if((options.failureFlash || options.successFlash) && !req.flash) {
			throw new Error('To use failureFlash, flash middleware is required such as connect-flash');
		}

		if(token && uid) {
			self._tokenStore.authenticate(token, uid.toString(), function(error, valid, referrer) {
				if(valid) {
					var success = function() {

						req[self._userProperty] = uid;
						if(req.session) {
							req.session.passwordless = req[self._userProperty];
						}
						if(options.successFlash) {
							req.flash('passwordless-success', options.successFlash);
						}
						if(options.enableOriginRedirect && referrer) {
							// next() will not be called
							return self._redirectWithSessionSave(req, res, next, referrer);
						}
						if(options.successRedirect) {
							// next() will not be called, and
							// enableOriginRedirect has priority
							return self._redirectWithSessionSave(req, res, next, options.successRedirect);
						}
						next();
					}

					// Invalidate token, except allowTokenReuse has been set
					if(!self._allowTokenReuse) {
						self._tokenStore.invalidateUser(uid, function(err) {
							if(err) {
								next('TokenStore.invalidateUser() error: ' + error);
							} else {
								success();
							}
						})
					} else {
						success();
					}
				} else if(error) {
					next('TokenStore.authenticate() error: ' + error);
				} else if(options.failureFlash) {
					req.flash('passwordless', options.failureFlash);
					next();
				} else {
					next();
				}
			});
		} else {
			next();
		}
	}
}

/**
 * Returns express middleware that ensures that only successfully authenticated users
 * have access to any middleware or responses that follows this middleware. Can either
 * be used for individual URLs or a certain path and any sub-elements. By default, a
 * 401 error message is returned if the user has no access to the underlying resource.
 *
 * @example
 * router.get('/admin', passwordless.restricted({ failureRedirect: '/login' }),
 * 	function(req, res) {
 *  	res.render('admin', { user: req.user });
 * 	});
 * 			
 * @param  {Object} [options]
 * @param  {String} [options.failureRedirect] - If provided, the user will be redirected
 * to the given URL in case she is not authenticated. This would typically by a login 
 * page (example: '/login', default: null)
 * @param  {String} [options.failureFlash] - The error message to be flashed in case
 * the user is not authenticated. Using this option requires flash middleware such as 
 * connect-flash. The message will be stored as 'passwordless'. Can only be used in
 * combination with failureRedirect (example: 'No access!', default: null)
 * @param  {String} [options.originField] - If set, the originally requested URL will
 * be passed as query param (with the supplied name) to the redirect URL provided by
 * failureRedirect. Can only be used in combination with failureRedirect (example: 
 * 'origin', default: null)
 * @return {ExpressMiddleware} Express middleware
 * @throws {Error} Will throw an error if failureFlash is used without flash middleware, 
 * failureFlash is used without failureRedirect, or originField is used without 
 * failureRedirect
 */
Passwordless.prototype.restricted = function(options) {
	var self = this;
	options = options || {};
	var user = options.allowUserList ? options.allowUserList[self._userProperty] : true;
	return function(req, res, next) {
		if(req[self._userProperty] && user) {
			return next();
		}

		// not authorized
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

			self._redirectWithSessionSave(req, res, next, options.failureRedirect + queryParam);
		} else if(options.failureFlash) {
			throw new Error('failureFlash cannot be used without failureRedirect');
		} else if(options.originField) {
			throw new Error('originField cannot be used without failureRedirect');
		} else {
			self._send401(res, 'Provide a token');
  		}
	}
}

/**
 * Logs out the current user and invalidates any tokens that are still valid for the user
 *
 * @example
 * router.get('/logout', passwordless.logout( {options.successFlash: 'All done!'} ),
 * 	function(req, res) {
 * 		res.redirect('/');
 * });
 * 		
 * @param  {Object} [options]
 * @param  {String} [options.successFlash] - The success message to be flashed in case
 * has been logged in an the logout proceeded successfully. Using this option requires 
 * flash middleware such as connect-flash. The success message will be stored as 
 * 'passwordless-success'. (example: 'You are now logged in!', default: null)
 * 
 * @return {ExpressMiddleware} Express middleware
 * @throws {Error} Will throw an error if successFlash is used without flash middleware
 */
Passwordless.prototype.logout = function(options) {
	var self = this;
	return function(req, res, next) {
		if(req.session && req.session.passwordless) {
			delete req.session.passwordless;
		}
		if(req[self._userProperty]) {
			self._tokenStore.invalidateUser(req[self._userProperty], function() {
				delete req[self._userProperty];
				if(options && options.successFlash) {
					if(!req.flash) {
						return next('To use successFlash, flash middleware is requied such as connect-flash');
					} else {
						req.flash('passwordless-success', options.successFlash);
					}
				}
				next();
			});
		} else {
			next();
		}
	}
}

/**
 * By adding this middleware function to a route, Passwordless automatically restores
 * the logged in user from the session. In 90% of the cases, this is what is required. 
 * However, Passwordless can also work without session support in a stateless mode.
 *
 * @example
 * var app = express();
 * var passwordless = new Passwordless(new DBTokenStore());
 * 		
 * app.use(cookieParser());
 * app.use(expressSession({ secret: '42' }));
 * 		
 * app.use(passwordless.sessionSupport());
 * app.use(passwordless.acceptToken());
 *
 * @return {ExpressMiddleware} Express middleware
 * @throws {Error} Will throw an error no session middleware has been supplied
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

/**
 * @callback getUserID
 * @param  {Object} user Contact details provided by the user (e.g. email address)
 * @param  {String} delivery Delivery method used (can be null)
 * @param  {function(error, user)} callback To be called in the format 
 * callback(error, user), where error is either null or an error message and user 
 * is either null if not user has been found or the user ID.
 * @param  {Object} req Express request object
 */

/**
 * Requests a token from Passwordless for a specific user and calls the delivery strategy 
 * to send the token to the user. Sends back a 401 error message if the user is not valid 
 * or a 400 error message if no user information has been transmitted at all. By default,
 * POST params will be expected
 * 
 * @example
 * router.post('/sendtoken', 
 * 	passwordless.requestToken(
 * 		function(user, delivery, callback, req) {
 * 			// usually you would want something like:
 * 			User.find({email: user}, callback(ret) {
 * 				if(ret)
 * 					callback(null, ret.id)
 * 				else
 * 					callback(null, null)
 * 			})
 * 		}),
 * 		function(req, res) {
 * 			res.render('sent');
 * 		});
 *
 * @param  {getUserID} getUserID The function called to resolve the supplied user contact 
 * information (e.g. email) into a proper user ID: function(user, delivery, callback, req)
 * where user contains the contact details provided, delivery the method used, callback 
 * expects a call in the format callback(error, user), where error is either null or an 
 * error message and user is either null if not user has been found or the user ID. req 
 * contains the Express request object
 * @param  {Object} [options]
 * @param  {String} [options.failureRedirect] - If provided, the user will be redirected
 * to the given URL in case the user details were not provided or could not be validated
 * by getUserId. This could typically by a login page (example: '/login', default: null)
 * @param  {String} [options.failureFlash] - The error message to be flashed in case
 * the user details could not be validated. Using this option requires flash middleware 
 * such as connect-flash. The message will be stored as 'passwordless'. Can only be used 
 * in combination with failureRedirect (example: 'Your user details seem strange', 
 * default: null)
 * @param  {String} [options.successFlash] - The message to be flashed in case the tokens
 * were send out successfully. Using this option requires flash middleware such as 
 * connect-flash. The message will be stored as 'passwordless-success '. 
 * (example: 'Your token has been send', default: null)
 * @param  {String} [options.userField] - The field which contains the user's contact 
 * detail such as her email address (default: 'user')
 * @param  {String} [options.deliveryField] - The field which contains the name of the
 * delivery method to be used. Only needed if several strategies have been added with
 * addDelivery() (default: null)
 * @param  {String} [options.originField] - If set, requestToken() will look for any
 * URLs in this field that will be stored in the token database so that the user can
 * be redirected to this URL as soon as she is authenticated. Usually used to redirect 
 * the user to the resource that she originally requested before being redirected to
 * the login page (default: null)
 * @param  {Boolean} [options.allowGet] - If set, requestToken() will look for GET 
 * parameters instead of POST (default: false)
 * @return {ExpressMiddleware} Express middleware
 * @throws {Error} Will throw an error if failureFlash is used without flash middleware, 
 * failureFlash is used without failureRedirect, successFlash is used without flash 
 * middleware, no body parser is used and POST parameters are expected, or if no 
 * delivery method has been added
 */
Passwordless.prototype.requestToken = function(getUserID, options) {
	var self = this;
	options = options || {};
	
	return function(req, res, next) {
		var sendError = function(statusCode, authenticate) {
			if(options.failureRedirect) {
				if(options.failureFlash) {
					req.flash('passwordless', options.failureFlash);
				}
				self._redirectWithSessionSave(req, res, next, options.failureRedirect);
			} else {
				if(statusCode === 401) {
					self._send401(res, authenticate)
				} else {
					res.status(statusCode).send();
				}
			}
		}

		if(!self._tokenStore) {
			throw new Error('Passwordless is missing a TokenStore. Are you sure you called passwordless.init()?');
		}

		if(!req.body && !options.allowGet) {
			throw new Error('req.body does not exist: did you require middleware to accept POST data (such as body-parser) before calling acceptToken?')
		} else if(!self._defaultDelivery && Object.keys(self._deliveryMethods).length === 0) {
			throw new Error('passwordless requires at least one delivery method which can be added using passwordless.addDelivery()');
		} else if((options.successFlash || options.failureFlash) && !req.flash) {
			throw new Error('To use failureFlash or successFlash, flash middleware is required such as connect-flash');
		} else if(options.failureFlash && !options.failureRedirect) {
			throw new Error('failureFlash cannot be used without failureRedirect');
		}

		var userField = (options.userField) ? options.userField : 'user';
		var deliveryField = (options.deliveryField) ? options.deliveryField : 'delivery';
		var originField = (options.originField) ? options.originField : null;

		var user, delivery, origin;
		if(req.body && req.method === "POST") {
			user = req.body[userField];
			delivery = req.body[deliveryField];
			if(originField) {
				origin = req.body[originField];
			}
		} else if(options.allowGet && req.method === "GET") {
			user = req.query[userField];
			delivery = req.query[deliveryField];
			if(originField) {
				origin = req.query[originField];
			}
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
				var token;
				try {
					if(deliveryMethod.options.numberToken && deliveryMethod.options.numberToken.max) {
						token = self._generateNumberToken(deliveryMethod.options.numberToken.max);
					} else {
						token = (deliveryMethod.options.tokenAlgorithm || self._generateToken())();
					}
				} catch(err) {
					next(new Error('Error while generating a token: ' + err));
				}
				var ttl = deliveryMethod.options.ttl || 60 * 60 * 1000;

				self._tokenStore.storeOrUpdate(token, uid.toString(), ttl, origin, function(storeError) {
					if(storeError) {
						next(new Error('Error on the storage layer: ' + storeError));
					} else {
						deliveryMethod.sendToken(token, uid, user, function(deliveryError) {
							if(deliveryError) {
								next(new Error('Error on the deliveryMethod delivery layer: ' + deliveryError));
							} else {
								if(!req.passwordless) {
									req.passwordless = {};
								}
								req.passwordless.uidToAuth = uid;
								if(options.successFlash) {
									req.flash('passwordless-success', options.successFlash);
								}
								next();
							}
						}, req)		
					}	
				});
			} else {
				sendError(401, 'Provide a valid user');
			}
		}, req)
	}
}

/**
 * @callback sendToken
 * @param  {String} tokenToSend The token to send
 * @param  {Object} uidToSend The UID that has to be part of the token URL
 * @param  {String} recipient the target such as an email address or a phone number 
 * depending on the user input
 * @param  {function(error)} callback Has to be called either with no parameters or 
 * with callback({String}) in case of any issues during delivery
 * @param  {Object} req The request object
 */

/**
 * Adds a new delivery method to Passwordless used to transmit tokens to the user. This could, 
 * for example, be an email client or a sms client. If only one method is used, no name has to 
 * provided as it will be the default delivery method. If several methods are used and added, 
 * they will have to be named.
 *
 * @example
 * passwordless.init(new MongoStore(pathToMongoDb));
 * passwordless.addDelivery(
 * 	function(tokenToSend, uidToSend, recipient, callback, req) {
 * 		// Send out token
 * 		smtpServer.send({
 * 			text:    'Hello!\nYou can now access your account here: ' 
 * 				+ host + '?token=' + tokenToSend + '&uid=' + encodeURIComponent(uidToSend), 
 * 			from:    yourEmail, 
 * 			to:      recipient,
 * 			subject: 'Token for ' + host
 * 		}, function(err, message) { 
 * 			if(err) {
 * 				console.log(err);
 * 			}
 * 			callback(err);
 * 		});
 * 	});
 * 	
 * @param {String} [name] - Name of the strategy. Not needed if only one method is added
 * @param {sendToken} sendToken - Method that will be called as
 * function(tokenToSend, uidToSend, recipient, callback, req) to transmit the token to the 
 * user. tokenToSend contains the token, uidToSend the UID that has to be part of the 
 * token URL, recipient contains the target such as an email address or a phone number 
 * depending on the user input, and callback has to be called either with no parameters 
 * or with callback({String}) in case of any issues during delivery
 * @param  {Object} [options]
 * @param  {Number} [options.ttl] - Duration in ms that the token shall be valid 
 * (example: 1000*60*30, default: 1 hour)
 * @param  {function()} [options.tokenAlgorithm] - The algorithm used to generate a token. 
 * Function shall return the token in sync mode (default: Base58 token)
 * @param  {Number} [options.numberToken.max] - Overwrites the default token generator
 * by a random number generator which generates numbers between 0 and max. Cannot be used
 * together with options.tokenAlgorithm
 */
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
		(options.tokenAlgorithm && typeof options.tokenAlgorithm !== 'function') ||
		(options.numberToken && (!options.numberToken.max || typeof options.numberToken.max !== 'number'))) {
		throw new Error('One of the provided options is of the wrong format');
	} else if(options.tokenAlgorithm && options.numberToken) {
		throw new Error('options.tokenAlgorithm cannot be used together with options.numberToken');
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

/**
 * Sends a 401 error message back to the user
 * @param  {Object} res - Node's http res object
 * @private
 */
Passwordless.prototype._send401 = function(res, authenticate) {
	res.statusCode = 401;
	if(authenticate) {
		res.setHeader('WWW-Authenticate', authenticate);
	}
	res.end('Unauthorized');
}

/**
 * Avoids a bug in express that might lead to a redirect
 * before the session is actually saved
 * @param  {Object} req - Node's http req object
 * @param  {Object} res - Node's http res object
 * @param  {Function} next - Middleware callback
 * @param  {String} target - URL to redirect to
 * @private
 */
Passwordless.prototype._redirectWithSessionSave = function(req, res, next, target) {
	if (!req.session || this._skipForceSessionSave) {
		return res.redirect(target);
	} else {
		req.session.save(function(err) {
			if (err) {
				return next(err);
			} else {
				res.redirect(target);
			}
		});
	}
};

/**
 * Generates a random token using Node's crypto rng
 * @param  {Number} randomBytes - Random bytes to be generated
 * @return {function()} token-generator function
 * @throws {Error} Will throw an error if there is no sufficient
 * entropy accumulated
 * @private
 */
Passwordless.prototype._generateToken = function(randomBytes) {
	randomBytes = randomBytes || 16;
	return function() {
		var buf = crypto.randomBytes(randomBytes);
		return base58.encode(buf);
	}
};

/**
 * Generates a strong random number between 0 and a maximum value. The
 * maximum value cannot exceed 2^32
 * @param  {Number} max - Maximum number to be generated
 * @return {Number} Random number between 0 and max
 * @throws {Error} Will throw an error if there is no sufficient
 * entropy accumulated
 * @private
 */
Passwordless.prototype._generateNumberToken = function(max) {
	var buf = crypto.randomBytes(4);
	return Math.floor(buf.readUInt32BE(0)%max).toString();
};

module.exports = Passwordless;

/** 
 * Express middleware
 * @name ExpressMiddleware
 * @function
 * @param {Object} req
 * @param {Object} res
 * @param {Object} next
 */
