'use strict';

var expect = require('chai').expect;
var express = require('express');
var request = require('supertest');
var passwordless = require('../lib');
var AuthDataStoreMock = require('./mock/authdatastore');

describe('passwordless', function() {
	describe('authenticate() [token supplied]', function() {
		it('should return 403 if the token passed is empty', function (done) {

			var app = express();

			app.get('/protected', passwordless.authenticate(),
				function(req, res){
					res.send(200, 'authenticated');
			});

			request(app)
				.get('/protected?token=')
				.expect(403, done);
		}),
		it('should return 403 if no token passed is passed at all', function (done) {

			var app = express();

			app.get('/protected', passwordless.authenticate(),
				function(req, res){
					res.send(200, 'authenticated');
			});

			request(app)
				.get('/protected')
				.expect(403, done);
		}),
		it('should flash a message if token is invalid and "flashMessage" is set to true', function (done) {

			var app = express();

			app.get('/protected', passwordless.authenticate({ 	notAuthRedirect: '/login',
																flashMessage: true }),
				function(req, res){
					res.send(200, 'authenticated');
			});

			request(app)
				.get('/protected?token=invalid')
				.expect(302)
				expect('location', '/login', done('should flash a message saying that the token is invalid'));
		}),
		it('should redirect to "notAuthRedirect" and pass the original URL to "originUrlParam" is both are provided and the passed token is empty', function (done) {

			var app = express();

			app.get('/protected', passwordless.authenticate({ 	notAuthRedirect: '/login?mode=test',
																originUrlParam: 'origin' }),
				function(req, res){
					res.send(200, 'authenticated');
			});

			request(app)
				.get('/protected?id=3&token=&lang=en')
				.expect(302)
				.expect('location', '/login?mode=test&origin=%2Fprotected%3Fid%3D3%26token%3D%26lang%3Den', done);
		}),
		it('should return 403 if the token passed is invalid', function (done) {

			var app = express();

			passwordless.init(new AuthDataStoreMock());

			app.get('/protected', passwordless.authenticate(),
				function(req, res){
					res.send(200, 'authenticated');
			});

			request(app)
				.get('/protected?token=invalid')
				.expect(403, done);
		}),
		it('should return an internal server error if DataStore does return error', function (done) {

			var app = express();

			passwordless.init(new AuthDataStoreMock());

			app.get('/protected', function(req, res, next) { 
				var auth = passwordless.authenticate()
				try {
					auth(req, res, next);
					done('an exception should be thrown');
				} catch(err) {
					done();
				}
			},
				function(req, res) {
					res.send(200, 'authenticated');
			});

			request(app)
				.get('/protected?token=error')
				.expect(500, done);
		}),
		describe('with proper token', function(done) {

			var app = express();
			passwordless.init(new AuthDataStoreMock());
				
			app.get('/protected', passwordless.authenticate(),
				function(req, res){
					res.send(200, 'authenticated');
			});

			var agent = request.agent(app);

			it('should forward to the requested URL', function (done) {
				agent
					.get('/protected?token=valid')
					.expect(200, 'authenticated', done);
			});

			it('should return 403 after supplying the token again (invalidation happens through AuthDataStore)', function (done) {
				agent
					.get('/protected?token=valid')
					.expect(403, done);
			});
		})
	})
});