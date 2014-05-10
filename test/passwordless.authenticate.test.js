'use strict';

var expect = require('chai').expect;
var express = require('express');
var request = require('supertest');
var passwordless = require('../lib');

describe('passwordless', function() {
	describe('authenticate() [no authentication yet]', function() {
		it('should return 403 if passwordless is not initialized - use scenario 1/3', function (done) {

			var app = express();

			app.get('/test', passwordless.authenticate(),
				function(req, res){
					res.send(200, 'authenticated');
			});

			request(app)
				.get('/test')
				.expect(403, done);
		}),
		it('should return 403 if passwordless is not initialized - use scenario 2/3', function (done) {

			var app = express();

			app.use(passwordless.authenticate());

			app.get('/test',
				function(req, res){
					res.send(200, 'authenticated');
			});

			request(app)
				.get('/test')
				.expect(403, done);
		}),
		it('should return 403 if passwordless is not initialized - use scenario 3/3', function (done) {

			var app = express();

			app.use('/restricted', passwordless.authenticate());

			app.get('/restricted/test',
				function(req, res){
					res.send(200, 'authenticated');
			});

			app.get('/everyone',
				function(req, res){
					res.send(200, 'authenticated');
			});

			request(app)
				.get('/restricted/test')
				.expect(403, done);


		}),
		it('should allow request if middleware is not in the mount path of express', function (done) {

			var app = express();

			app.use('/restricted', passwordless.authenticate());

			app.get('/restricted/test',
				function(req, res){
					res.send(200, 'authenticated');
			});

			app.get('/everyone',
				function(req, res){
					res.send(200, 'authenticated');
			});

			request(app)
				.get('/everyone')
				.expect(200, done);
		}),
		it('should redirect to the given URL if "notAuthRedirect" is provided and user not authorized', function (done) {

			var app = express();

			app.get('/test', passwordless.authenticate({ notAuthRedirect: '/login' }),
				function(req, res){
					res.send(200, 'authenticated');
			});

			request(app)
				.get('/test')
				.expect(302)
				.expect('location', '/login', done);
		}),
		it('should redirect and pass the original URL if not authorized if "originUrlParam" is provided / simple', function (done) {

			var app = express();

			app.get('/test', passwordless.authenticate({ 	notAuthRedirect: '/login',
															originUrlParam: 'origin' }),
				function(req, res){
					res.send(200, 'authenticated');
			});

			request(app)
				.get('/test?id=3')
				.expect(302)
				.expect('location', '/login?origin=%2Ftest%3Fid%3D3', done);
		}),
		it('should redirect and pass the original URL if not authorized if "originUrlParam" is provided / additional param', function (done) {

			var app = express();

			app.get('/test', passwordless.authenticate({ 	notAuthRedirect: '/login?mode=test&lang=en',
															originUrlParam: 'origin' }),
				function(req, res){
					res.send(200, 'authenticated');
			});

			request(app)
				.get('/test?id=3')
				.expect(302)
				.expect('location', '/login?mode=test&lang=en&origin=%2Ftest%3Fid%3D3', done);
		}),
		it('should flash a message if user is not authorized and "flashMessage" is set to true', function (done) {

			var app = express();

			app.get('/protected', passwordless.authenticate({ 	notAuthRedirect: '/login',
																flashMessage: true }),
				function(req, res){
					res.send(200, 'authenticated');
			});

			request(app)
				.get('/protected')
				.expect(302)
				expect('location', '/login', done('should flash a message saying that user is not authorized'));
		})
	})
});