'use strict';

var expect = require('chai').expect;
var express = require('express');
var request = require('supertest');
var bodyParser = require('body-parser')
var Passwordless = require('../../').Passwordless;
var TokenStoreMock = require('../mock/tokenstoremock');
var cookieParser = require('cookie-parser');
var expressSession = require('express-session');
var flash = require('connect-flash');

describe('passwordless', function() {
	describe('acceptToken()', function() {
		it('should not influence the delivery of unrestricted assets', function (done) {

			var app = express();
			var passwordless = new Passwordless();
			passwordless.init(new TokenStoreMock());

			app.use(passwordless.acceptToken());

			app.get('/unrestricted',
				function(req, res){
					res.status(200).send();
			});

			request(app)
				.get('/unrestricted')
				.expect(200, done);
		})

		it('should return an internal server error if DataStore does return error', function (done) {

			var app = express();
			var passwordless = new Passwordless();
			passwordless.init(new TokenStoreMock());

			app.use(passwordless.acceptToken());

			app.get('/unrestricted', function(req, res) {
					res.status(200).send();
			});

			request(app)
				.get('/unrestricted?token=error&uid=error')
				.expect(500, done);
		})

		it('should throw an exception if used without initialized TokenStore', function (done) {

			var app = express();
			var passwordless = new Passwordless();

			app.use(passwordless.acceptToken());

			app.get('/unrestricted', function(req, res) {
					res.status(200).send();
			});

			request(app)
				.get('/unrestricted')
				.expect(500, done);
		})

		describe('restricted resources', function() {

			describe('with no further options', function() {
				runTestsWithOptions();
			})

			describe('with tokenField and uidField options set', function() {
				runTestsWithOptions('t', 'u');
			})

			describe('with tokenField option set', function() {
				runTestsWithOptions('t', null);
			})

			describe('with uidField option set', function() {
				runTestsWithOptions(null, 'u');
			})

			function runTestsWithOptions(tokenField, uidField) {

				var app = express();
				var passwordless = new Passwordless();
				passwordless.init(new TokenStoreMock());

				if(tokenField || uidField) {
					var options = {};
					if(tokenField)
						options.tokenField = tokenField;
					if(uidField)
						options.uidField = uidField;
					app.use(passwordless.acceptToken(options));
				} else {
					app.use(passwordless.acceptToken());
				}
				
				tokenField = (tokenField) ? tokenField : 'token';
				uidField = (uidField) ? uidField : 'uid';

				function buildQueryString(token, uid) {
					var str = tokenField + '=' + token;
					str += '&' + uidField + '=' + uid;
					return str;
				}

				app.get('/restricted', passwordless.restricted(),
					function(req, res){
						res.status(200).send('authenticated');
				});

				app.post('/restricted', passwordless.restricted(),
					function(req, res){
						res.status(200).send('authenticated');
				});

				it('should not give access to restricted resources and return 401 if no token / uid is provided', function (done) {
					request(app)
						.get('/restricted')
						.expect(401, done);
				})

				it('should not give access to restricted resources and return 401 if the passed token is empty', function (done) {
					request(app)
						.get('/restricted?' + buildQueryString('', 'valid'))
						.expect(401, done);
				})

				it('should not give access to restricted resources and return 401 if the passed uid is empty', function (done) {
					request(app)
						.get('/restricted?' + buildQueryString('valid', ''))
						.expect(401, done);
				})

				it('should not give access to restricted resources and return 401 if the passed token/uid is invalid', function (done) {
					request(app)
						.get('/restricted?' + buildQueryString('invalid', 'invalid'))
						.expect(401, done);
				})

				it('should give access to restricted resources if supplied token is valid', function (done) {
					request(app)
						.get('/restricted?' + buildQueryString('valid', 'valid'))
						.expect(200, done);
				})

				it('should not give access to restricted resources if supplied token is valid but POST', function (done) {
					request(app)
						.post('/restricted')
						.send('{ "' + tokenField + '" : "valid", "' + uidField + '" : "valid" }')
						.expect(401, done);
				})
			}
		})

		describe('option:enableOriginRedirect', function() {

			describe('successful authentication', function() {
				var app = express();
				var passwordless = new Passwordless();
				passwordless.init(new TokenStoreMock());

				app.get('/acceptToken', passwordless.acceptToken({ enableOriginRedirect: true }),
					function(req, res){
						res.status(200).send('no redirect happened');
				});

				it('should redirect after successful authentication', function (done) {
					// user marc has a redirect target
					request(app)
						.get('/acceptToken?token=marc&uid=marc')
						.expect(302)
						.expect('location', 'http://example.com/marc', done);
				})
			})

			describe('successful authentication but without redirect goal', function() {
				var app = express();
				var passwordless = new Passwordless();
				passwordless.init(new TokenStoreMock());

				app.get('/acceptToken', passwordless.acceptToken({ enableOriginRedirect: true }),
					function(req, res){
						res.status(200).send('no redirect happened');
				});

				it('should simply continue through the middleware if no redirect target', function (done) {
					// user tom has no redirect goal
					request(app)
						.get('/acceptToken?token=tom&uid=tom')
						.expect(200, 'no redirect happened', done);
				})
			})

			describe('successful authentication, supplied redirect goal but no option set', function() {
				var app = express();
				var passwordless = new Passwordless();
				passwordless.init(new TokenStoreMock());

				app.get('/acceptToken', passwordless.acceptToken(),
					function(req, res){
						res.status(200).send('no redirect happened');
				});

				it('should simply continue through the middleware if no option set', function (done) {
					// user tom has no redirect goal
					request(app)
						.get('/acceptToken?token=marc&uid=marc')
						.expect(200, 'no redirect happened', done);
				})
			})
		})

		describe('option:successRedirect', function() {
			describe('successful authentication', function() {
				var app = express();
				var passwordless = new Passwordless();
				passwordless.init(new TokenStoreMock());

				app.get('/acceptToken', passwordless.acceptToken({ successRedirect: '/success' }),
					function(req, res){
						res.status(200).send('no redirect happened');
				});

				it('should redirect the user after successful authentication', function (done) {
					request(app)
						.get('/acceptToken?token=valid&uid=valid')
						.expect(302)
						.expect('location', '/success', done);
				})
			})

			describe('unsuccessful authentication', function() {
				var app = express();
				var passwordless = new Passwordless();
				passwordless.init(new TokenStoreMock());

				app.get('/acceptToken', passwordless.acceptToken({ successRedirect: '/success' }),
					function(req, res){
						res.status(200).send('no redirect happened');
				});

				it('should redirect the user after successful authentication', function (done) {
					request(app)
						.get('/acceptToken?token=invalid&uid=invalid')
						.expect(200, 'no redirect happened', done);
				})
			})

			describe('successful authentication with POST tokens', function() {
				var app = express();
				var passwordless = new Passwordless();
				passwordless.init(new TokenStoreMock());

				app.use(bodyParser.json());
				app.use(bodyParser.urlencoded({extended: false}));

				app.post('/acceptToken', passwordless.acceptToken({ allowPost: true, successRedirect: '/success' }),
					function(req, res){
						res.status(200).send('no redirect happened');
				});

				it('should redirect the user after successful authentication', function (done) {
					request(app)
						.post('/acceptToken')
						.send({ token: 'valid', uid: 'valid' })
						.expect(302)
						.expect('location', '/success', done);
				})
			})

			describe('successful authentication combined with enableOriginRedirect and redirect target', function() {
				var app = express();
				var passwordless = new Passwordless();
				passwordless.init(new TokenStoreMock());

				app.get('/acceptToken', passwordless.acceptToken({ enableOriginRedirect: true, successRedirect: '/success' }),
					function(req, res){
						res.status(200).send('no redirect happened');
				});

				it('should overwrite successRedirect and instead use origin', function (done) {
					request(app)
						.get('/acceptToken?token=marc&uid=marc')
						.expect(302)
						.expect('location', 'http://example.com/marc', done);
				})
			})

			describe('successful authentication combined with enableOriginRedirect but no redirect target', function() {
				var app = express();
				var passwordless = new Passwordless();
				passwordless.init(new TokenStoreMock());

				app.get('/acceptToken', passwordless.acceptToken({ enableOriginRedirect: true, successRedirect: '/success' }),
					function(req, res){
						res.status(200).send('no redirect happened');
				});

				it('should use successRedirect and ignore enableOriginRedirect', function (done) {
					request(app)
						.get('/acceptToken?token=tom&uid=tom')
						.expect(302)
						.expect('location', '/success', done);
				})
			})
		})

		describe('allow POST tokens', function() {

			var app = express();
			var passwordless = new Passwordless();
			passwordless.init(new TokenStoreMock());

			app.use(bodyParser.json());
			app.use(bodyParser.urlencoded({extended: false}));
			app.use(passwordless.acceptToken( { allowPost: true } ));

			app.post('/restricted', passwordless.restricted(),
				function(req, res){
					res.status(200).send('authenticated');
			});

			it('should give access if supplied token/uid is valid (POST) and POST is allowed', function (done) {
				request(app)
					.post('/restricted')
					.send({ token: 'valid', uid: 'valid' })
					.expect(200, done);
			})
		})

		describe('POST tokens without body-parser', function() {

			var app = express();
			var passwordless = new Passwordless();
			passwordless.init(new TokenStoreMock());

			it('should throw an exception', function (done) {
				app.use(passwordless.acceptToken( { allowPost: true } ));

				app.post('/restricted', passwordless.restricted(),
					function(req, res){
						res.status(200).send('authenticated');
				});

				request(app)
					.post('/restricted')
					.send({ token: 'valid', uid: 'valid' })
					.expect(500, done);
			})
		})
		
		describe('unrestricted resources', function() {

			var app = express();
			var passwordless = new Passwordless();
			passwordless.init(new TokenStoreMock());

			app.use(passwordless.acceptToken());

			app.get('/unrestricted',
				function(req, res){
					res.status(200).send();
			});

			it('should deliver unrestricted resources if supplied token/uid is empty', function (done) {
				request(app)
					.get('/unrestricted?token=&uid=')
					.expect(200, done);
			})

			it('should deliver unrestricted resources if supplied token/uid is invalid', function (done) {
				request(app)
					.get('/unrestricted?token=invalid&uid=invalid')
					.expect(200, done);
			})
		})
		
		it('should flash an error message if supplied token/uid is invalid and "failureFlash" is supplied', function (done) {

			var app = express();
			var passwordless = new Passwordless();
			passwordless.init(new TokenStoreMock());

			app.use(cookieParser());
			app.use(expressSession({ secret: '42', resave: false, saveUninitialized:false }));

			app.use(flash());

			app.use(passwordless.acceptToken({ failureFlash: 'The submitted token for the given uid is not valid' }));

			app.get('/unrestricted',
				function(req, res){
					res.status(200).send(req.flash('passwordless')[0]);
			});

			request(app)
				.get('/unrestricted?token=invalid&uid=invalid')
				.expect(200, 'The submitted token for the given uid is not valid', done);
		})
		
		it('should flash a success message if supplied token/uid is valid and "successFlash" is supplied', function (done) {

			var app = express();
			var passwordless = new Passwordless();
			passwordless.init(new TokenStoreMock());

			app.use(cookieParser());
			app.use(expressSession({ secret: '42', resave: false, saveUninitialized:false }));

			app.use(flash());

			app.use(passwordless.acceptToken({ successFlash: 'All good!' }));

			app.get('/unrestricted',
				function(req, res){
					res.status(200).send(req.flash('passwordless-success')[0]);
			});

			request(app)
				.get('/unrestricted?token=valid&uid=valid')
				.expect(200, 'All good!', done);
		})

		it('should throw an exception if failureFlash is used without flash middleware', function (done) {

			var app = express();
			var passwordless = new Passwordless();
			passwordless.init(new TokenStoreMock());

			app.use(passwordless.acceptToken({ failureFlash: 'The submitted token is not valid' }));

			app.get('/unrestricted',
				function(req, res){
					res.status(200).send();
			});

			request(app)
				.get('/unrestricted?token=invalid&uid=invalid')
				.expect(500, done);
		})

		it('should throw an exception if successFlash is used without flash middleware', function (done) {

			var app = express();
			var passwordless = new Passwordless();
			passwordless.init(new TokenStoreMock());

			app.use(passwordless.acceptToken({ successFlash: 'All good!' }));

			app.get('/unrestricted',
				function(req, res){
					res.status(200).send();
			});

			request(app)
				.get('/unrestricted?token=valid&uid=valid')
				.expect(500, done);
		})
	})
});