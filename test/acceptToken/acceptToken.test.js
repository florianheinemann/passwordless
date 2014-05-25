'use strict';

var expect = require('chai').expect;
var express = require('express');
var request = require('supertest');
var bodyParser = require('body-parser')
var Passwordless = require('../../lib');
var TokenStoreMock = require('../mock/tokenstore');
var cookieParser = require('cookie-parser');
var expressSession = require('express-session');
var flash = require('connect-flash');

describe('passwordless', function() {
	describe('acceptToken()', function() {
		it('should not influence the delivery of unrestricted assets', function (done) {

			var app = express();
			var passwordless = new Passwordless(new TokenStoreMock());

			app.use(passwordless.acceptToken());

			app.get('/unrestricted',
				function(req, res){
					res.send(200);
			});

			request(app)
				.get('/unrestricted')
				.expect(200, done);
		})

		it('should return an internal server error if DataStore does return error', function (done) {

			var app = express();
			var passwordless = new Passwordless(new TokenStoreMock());

			app.use(function(req, res, next) { 
				var accept = passwordless.acceptToken()
				try {
					accept(req, res, next);
					done('an exception should be thrown');
				} catch(err) {
					done();
				}
			});

			app.get('/unrestricted', function(req, res) {
					res.send(200);
			});

			request(app)
				.get('/unrestricted?token=error')
				.expect(500, done);
		})

		describe('restricted resources', function() {

			var app = express();
			var passwordless = new Passwordless(new TokenStoreMock());

			app.use(passwordless.acceptToken());

			app.get('/restricted', passwordless.restricted(),
				function(req, res){
					res.send(200, 'authenticated');
			});

			app.post('/restricted', passwordless.restricted(),
				function(req, res){
					res.send(200, 'authenticated');
			});

			app.get('/restricted/:token', passwordless.restricted(),
				function(req, res){
					res.send(200, 'authenticated');
			});

			it('should not give access to restricted resources and return 403 if no token is provided', function (done) {
				request(app)
					.get('/restricted')
					.expect(403, done);
			})

			it('should not give access to restricted resources and return 403 if the passed token is empty', function (done) {
				request(app)
					.get('/restricted?token=')
					.expect(403, done);
			})

			it('should not give access to restricted resources and return 403 if the passed token is invalid', function (done) {
				request(app)
					.get('/restricted?token=invalid')
					.expect(403, done);
			})

			it('should give access to restricted resources if supplied token is valid', function (done) {
				request(app)
					.get('/restricted?token=valid')
					.expect(200, done);
			})

			it('should not give access to restricted resources if supplied token is valid but POST', function (done) {
				request(app)
					.post('/restricted')
					.send('token=valid')
					.expect(403, done);
			})

			// it('should not give access to restricted resources if supplied token is valid but PARAM', function (done) {
			// 	request(app)
			// 		.get('/restricted/valid')
			// 		.expect(403, done);
			// })
		})

		describe('allow POST tokens', function() {

			var app = express();
			var passwordless = new Passwordless(new TokenStoreMock());

			app.use(bodyParser());
			app.use(passwordless.acceptToken( { allowPost: true } ));

			app.post('/restricted', passwordless.restricted(),
				function(req, res){
					res.send(200, 'authenticated');
			});

			it('should give access to restricted resources if supplied token is valid (POST) and POST is allowed', function (done) {
				request(app)
					.post('/restricted')
					.send('token=valid')
					.expect(200, done);
			})
		})

		describe('POST tokens without body-parser', function() {

			var app = express();
			var passwordless = new Passwordless(new TokenStoreMock());

			it('should throw an error', function (done) {
				app.use(function(req, res, next) {
					var accept = passwordless.acceptToken( { allowPost: true } );
					try {
						accept(req, res, next);
						done('should have thrown an error');
					} catch(err) {
						done();
					}
				});

				app.post('/restricted', passwordless.restricted(),
					function(req, res){
						res.send(200, 'authenticated');
				});

				request(app)
					.post('/restricted')
					.send('token=valid')
					.expect(503, done);
			})
		})

		// describe('allow PARAM tokens', function() {

		// 	var app = express();
		// 	var passwordless = new Passwordless(new TokenStoreMock());

		// 	app.use(passwordless.acceptToken( { allowParam: true } ));

		// 	app.get('/restricted/:token', passwordless.restricted(),
		// 		function(req, res){
		// 			res.send(200, 'authenticated');
		// 	});

		// 	it('should give access to restricted resources if supplied token is valid (PARAM) and PARAM is allowed', function (done) {
		// 		request(app)
		// 			.get('/restricted/valid')
		// 			.expect(200, done);
		// 	})
		// })

		// describe('allow PARAM and POST tokens', function() {

		// 	var app = express();
		// 	var passwordless = new Passwordless(new TokenStoreMock());

		// 	app.use(bodyParser());
		// 	app.use(passwordless.acceptToken( { allowPost: true, allowParam: true } ));

		// 	app.get('/restricted/:token', passwordless.restricted(),
		// 		function(req, res){
		// 			res.send(200, 'authenticated');
		// 	});

		// 	app.post('/restricted', passwordless.restricted(),
		// 		function(req, res){
		// 			res.send(200, 'authenticated');
		// 	});

		// 	it('should give access to restricted resources if supplied token is valid (POST) and POST is allowed', function (done) {
		// 		request(app)
		// 			.post('/restricted')
		// 			.send('token=valid')
		// 			.expect(200, done);
		// 	})

		// 	it('should give access to restricted resources if supplied token is valid (PARAM) and PARAM is allowed', function (done) {
		// 		request(app)
		// 			.get('/restricted/valid')
		// 			.expect(200, done);
		// 	})
		// })
		
		describe('unrestricted resources', function() {

			var app = express();
			var passwordless = new Passwordless(new TokenStoreMock());

			app.use(passwordless.acceptToken());

			app.get('/unrestricted',
				function(req, res){
					res.send(200);
			});

			it('should just deliver unrestricted resources if supplied token is empty', function (done) {
				request(app)
					.get('/unrestricted?token=')
					.expect(200, done);
			})

			it('should just deliver unrestricted resources if supplied token is invalid', function (done) {
				request(app)
					.get('/unrestricted?token=invalid')
					.expect(200, done);
			})
		})
		
		it('should flash an error message if supplied token is invalid and "flashInvalidToken" is supplied', function (done) {

			var app = express();
			var passwordless = new Passwordless(new TokenStoreMock());

			app.use(cookieParser());
			app.use(expressSession({ secret: '42' }));

			app.use(flash());

			app.use(passwordless.acceptToken({ flashInvalidToken: 'The submitted token is not valid' }));

			app.get('/unrestricted',
				function(req, res){
					res.send(200, req.flash('passwordless')[0]);
			});

			request(app)
				.get('/unrestricted?token=invalid')
				.expect(200, 'The submitted token is not valid', done);
		})

		it('should throw an error if flashInvalidToken is used without flash middleware', function (done) {

			var app = express();
			var passwordless = new Passwordless(new TokenStoreMock());

			app.use(function(req, res, next) { 
				var accept = passwordless.acceptToken({ flashInvalidToken: 'The submitted token is not valid' });
				try {
					accept(req, res, next);
					done('an exception should be thrown');
				} catch(err) {
					done();
				}
			});

			app.get('/unrestricted',
				function(req, res){
					res.send(200);
			});

			request(app)
				.get('/unrestricted?token=invalid')
				.expect(500, done);
		})
	})
});