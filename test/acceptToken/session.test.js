'use strict';

var expect = require('chai').expect;
var express = require('express');
var request = require('supertest');
var cookieParser = require('cookie-parser');
var expressSession = require('express-session');
var cookieSession = require('cookie-session');
var Passwordless = require('../../').Passwordless;
var TokenStoreMock = require('../mock/tokenstoremock');

describe('passwordless', function() {
	describe('acceptToken() [session test]', function() {
		describe('login and preserve', function() {

			var loginAndPreserveTests = function(sessionMiddleware) {
				var app = express();
				var passwordless = new Passwordless();
				passwordless.init(new TokenStoreMock());

				app.use(cookieParser());
				app.use(sessionMiddleware);

				app.use(passwordless.sessionSupport());
				app.use(passwordless.acceptToken());
					
				app.get('/protected', passwordless.restricted(),
					function(req, res){
						res.status(200).send('authenticated');
				});

				var agent = request.agent(app);
				var agent2 = request.agent(app);

				it('should return HTTP 401 for a protected URL', function (done) {
					agent
						.get('/protected')
						.expect(401, done);
				});

				it('should forward to the requested URL with valid token', function (done) {
					agent
						.get('/protected?token=valid&uid=valid')
						.expect(200, 'authenticated', done);
				});

				it('should now forward to the requested URL even without token', function (done) {
					agent
						.get('/protected')
						.expect(200, 'authenticated', done);
				});

				it('should not allow anyone else access to the protected resource', function (done) {
					agent2
						.get('/protected')
						.expect(401, done);
				});
			}

			describe('expressSession', function() {
				loginAndPreserveTests(expressSession({ secret: '42' }));
			})

			describe('cookieSession', function() {
				loginAndPreserveTests(cookieSession({ secret: '42' }));
			})

			describe('typical failures', function() {
				it('should throw an exception if used without session middleware', function (done) {
					var app = express();
					var passwordless = new Passwordless();
					passwordless.init(new TokenStoreMock());

					app.use(passwordless.sessionSupport());
					app.use(passwordless.acceptToken());
						
					app.get('/protected', passwordless.restricted(),
						function(req, res){
							res.status(200).send('authenticated');
					});

					var agent = request.agent(app);
					agent
						.get('/protected')
						.expect(500, done);
				})
			});
		})
	})
});