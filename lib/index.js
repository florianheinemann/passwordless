'use strict';

var url = require('url');

var _dataStore = null;

module.exports = {
	authenticate: function(options) {
		return function(req, res, next) {
			options = options || {};

			if(req.query.token) {
				var token = req.query.token;

				if(_dataStore) {
					_dataStore.authenticate(token, function(error, uid, referrer) {
						if(uid) {
							next();
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
	},

	init: function(dataStore) {
		_dataStore = dataStore;
	}
};
