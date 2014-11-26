'use strict';

var expect = require('chai').expect;
var express = require('express');
var request = require('supertest');
var cookieParser = require('cookie-parser');
var expressSession = require('express-session');
var Passwordless = require('../../').Passwordless;
var TokenStoreMock = require('../mock/tokenstoremock');

describe('passwordless', function() {
	describe('user', function() {
		describe('sessions enabled', function() {

			var sessionTest = function(userProperty) {
				var app = express();
				var passwordless = new Passwordless();

				if(!userProperty) {
					passwordless.init(new TokenStoreMock());
					userProperty = 'user';
				} else {
					passwordless.init(new TokenStoreMock(), { userProperty: userProperty });
				}

				app.use(cookieParser());
				app.use(expressSession( { secret: '42', resave: false, saveUninitialized:false } ));

				app.use(passwordless.sessionSupport());
				app.use(passwordless.acceptToken());
					
				app.get('/protected', passwordless.restricted(),
					function(req, res){
						res.status(200).send((req[userProperty]) ? req[userProperty] : '{none}' );
				});
					
				app.get('/logout', passwordless.logout(),
					function(req, res){
						res.status(200).send((req[userProperty]) ? req[userProperty] : '{none}' );
				});
					
				app.get('/not-protected',
					function(req, res){
						res.status(200).send((req[userProperty]) ? req[userProperty] : '{none}' );
				});

				var agent = request.agent(app);
				var agent2 = request.agent(app);

				it('should not fill req.user if no user is logged in', function (done) {
					agent
						.get('/not-protected')
						.expect(200, '{none}', done);
				});

				it('should fill req.user right after login', function (done) {
					agent
						.get('/protected?token=marc&uid=marc')
						.expect(200, 'marc', done);
				});

				it('should continue filling req.user also without token after login', function (done) {
					agent
						.get('/protected')
						.expect(200, 'marc', done);
				});

				it('should continue filling req.user also without token and in non-protected pages after login', function (done) {
					agent
						.get('/not-protected')
						.expect(200, 'marc', done);
				});

				it('should not fill req.user for any other user who is not logged in', function (done) {
					agent2
						.get('/not-protected')
						.expect(200, '{none}', done);
				});

				it('should fill req.user right after login for a 2nd user', function (done) {
					agent2
						.get('/protected?token=alice&uid=alice')
						.expect(200, 'alice', done);
				});

				it('should still fill the correct req.user for a user even after another is logged in', function (done) {
					agent
						.get('/not-protected')
						.expect(200, 'marc', done);
				});

				it('should not fill req.user anymore right after logout', function (done) {
					agent
						.get('/logout')
						.expect(200, '{none}', done);
				});

				it('should not fill req.user anymore after logout', function (done) {
					agent
						.get('/not-protected')
						.expect(200, '{none}', done);
				});

				it('should fill req.user right after login using an unprotected resource', function (done) {
					agent
						.get('/not-protected?token=marc&uid=marc')
						.expect(200, 'marc', done);
				});
			}

			describe('user details in req.user (default)', function() {
				sessionTest();
			})

			describe('user details stored in a non-default property', function() {
				sessionTest('customer');
			})
		});

		describe('stateless', function(done) {

			var app = express();
			var passwordless = new Passwordless();
			passwordless.init(new TokenStoreMock(true), { allowTokenReuse: true });

			app.use(passwordless.acceptToken());

			app.get('/protected', passwordless.restricted(),
				function(req, res){
					res.status(200).send((req.user) ? req.user : '{none}' );
			});
				
			app.get('/logout', passwordless.logout(),
				function(req, res){
					res.status(200).send((req.user) ? req.user : '{none}' );
			});
				
			app.get('/not-protected',
				function(req, res){
					res.status(200).send((req.user) ? req.user : '{none}' );
			});

			var agent = request.agent(app);

			it('should not fill req.user if no user is logged in', function (done) {
				agent
					.get('/not-protected')
					.expect(200, '{none}', done);
			});

			it('should fill req.user right after login', function (done) {
				agent
					.get('/protected?token=marc&uid=marc')
					.expect(200, 'marc', done);
			});

			it('should delete req.user for any non-authenticated request', function (done) {
				agent
					.get('/not-protected')
					.expect(200, '{none}', done);
			});

			it('should again fill req.user for a properly authenticated request', function (done) {
				agent
					.get('/protected?token=marc&uid=marc')
					.expect(200, 'marc', done);
			});

			it('should fill req.user right after login for a 2nd user', function (done) {
				agent
					.get('/protected?token=alice&uid=alice')
					.expect(200, 'alice', done);
			});

			it('should still fill the correct req.user for a user even after another one logged in', function (done) {
				agent
					.get('/protected?token=marc&uid=marc')
					.expect(200, 'marc', done);
			});

			it('should not fill req.user right after logout', function (done) {
				agent
					.get('/logout')
					.expect(200, '{none}', done);
			});

			it('should not fill req.user anymore after logout', function (done) {
				agent
					.get('/not-protected')
					.expect(200, '{none}', done);
			});
		});

		describe('change of user', function(done) {

			var app = express();
			var passwordless = new Passwordless();
			passwordless.init(new TokenStoreMock());

			app.use(cookieParser());
			app.use(expressSession( { secret: '42', resave: false, saveUninitialized:false } ));

			app.use(passwordless.sessionSupport());
			app.use(passwordless.acceptToken());
				
			app.get('/restricted', passwordless.restricted(),
				function(req, res){
					res.status(200).send((req.user) ? req.user : '{none}' );
			});

			var agent = request.agent(app);

			it('should forward to the requested URL with proper token', function (done) {
				agent
					.get('/restricted?token=marc&uid=marc')
					.expect(200, 'marc', done);
			});

			it('should ignore if afterwards an invalid token is passed', function (done) {
				agent
					.get('/restricted?token=invalid')
					.expect(200, done);
			});

			it('should still have the original user logged in', function (done) {
				agent
					.get('/restricted')
					.expect(200, 'marc', done);
			});

			it('should allow change of user', function (done) {
				agent
					.get('/restricted?token=alice&uid=alice')
					.expect(200, 'alice', done);
			});

			it('should still have the new user logged in', function (done) {
				agent
					.get('/restricted')
					.expect(200, 'alice', done);
			});
		})
	});
});