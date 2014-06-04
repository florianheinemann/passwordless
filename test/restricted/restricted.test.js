'use strict';

var expect = require('chai').expect;
var express = require('express');
var request = require('supertest');
var Passwordless = require('../../').Passwordless;
var TokenStoreMockAuthOnly = require('../mock/tokenstoreauthonly');
var cookieParser = require('cookie-parser');
var expressSession = require('express-session');
var flash = require('connect-flash');

describe('passwordless', function() {
	describe('restricted() [no authentication yet]', function() {
		it('should return 401 if restricted() middleware is used and no authentication provided - 1/2', function (done) {

			var app = express();
			var passwordless = new Passwordless();
			passwordless.init(new TokenStoreMockAuthOnly());

			app.get('/restricted', passwordless.restricted(),
				function(req, res){
					res.send(200, 'authenticated');
			});

			request(app)
				.get('/restricted')
				.expect(401, done);
		})

		it('should return 401 if restricted() middleware is used and no authentication provided - 2/2', function (done) {

			var app = express();
			var passwordless = new Passwordless();
			passwordless.init(new TokenStoreMockAuthOnly());

			app.use(passwordless.restricted());

			app.get('/restricted',
				function(req, res){
					res.send(200, 'authenticated');
			});

			request(app)
				.get('/restricted')
				.expect(401, done);
		})

		it('should allow request if middleware is not in the mount path of express', function (done) {

			var app = express();
			var passwordless = new Passwordless();
			passwordless.init(new TokenStoreMockAuthOnly());

			app.use('/restricted', passwordless.restricted());

			app.get('/everyone',
				function(req, res){
					res.send(200, 'authenticated');
			});

			request(app)
				.get('/everyone')
				.expect(200, done);
		})

		it('should redirect to the given URL if "notAuthRedirect" is provided and user not authorized', function (done) {

			var app = express();
			var passwordless = new Passwordless();
			passwordless.init(new TokenStoreMockAuthOnly());

			app.get('/restricted', passwordless.restricted({ notAuthRedirect: '/login' }),
				function(req, res){
					res.send(200, 'authenticated');
			});

			request(app)
				.get('/restricted')
				.expect(302)
				.expect('location', '/login', done);
		})

		it('should redirect and pass the original URL if not authorized if "originUrlParam" is provided / simple', function (done) {

			var app = express();
			var passwordless = new Passwordless();
			passwordless.init(new TokenStoreMockAuthOnly());

			app.get('/restricted', passwordless.restricted({ 	notAuthRedirect: '/login',
														originUrlParam: 'origin' }),
				function(req, res){
					res.send(200, 'authenticated');
			});

			request(app)
				.get('/restricted?id=3')
				.expect(302)
				.expect('location', '/login?origin=%2Frestricted%3Fid%3D3', done);
		})

		it('should redirect and pass the original URL if not authorized if "originUrlParam" is provided / additional param', function (done) {

			var app = express();
			var passwordless = new Passwordless();
			passwordless.init(new TokenStoreMockAuthOnly());

			app.get('/restricted', passwordless.restricted({ 	notAuthRedirect: '/login?mode=test&lang=en',
																originUrlParam: 'origin' }),
				function(req, res){
					res.send(200, 'authenticated');
			});

			request(app)
				.get('/restricted?id=3')
				.expect(302)
				.expect('location', '/login?mode=test&lang=en&origin=%2Frestricted%3Fid%3D3', done);
		})

		describe('flashUserNotAuth', function() {

			var app = express();
			var passwordless = new Passwordless();
			passwordless.init(new TokenStoreMockAuthOnly());

			app.use(cookieParser());
			app.use(expressSession({ secret: '42' }));

			app.use(flash());

			app.get('/restricted', passwordless.restricted({ 	notAuthRedirect: '/login',
																flashUserNotAuth: 'You are not authorized' }),
				function(req, res){
					res.send(200);
			});

			app.get('/login',
				function(req, res) {
					res.send(200, req.flash('passwordless')[0]);
			});

			var agent = request(app);
			var cookie;

			it('should redirect if user is not authorized', function (done) {
				agent
					.get('/restricted')
					.expect(302)
					.expect('location', '/login')
					.end(function(err,res) {
						cookie = res.headers['set-cookie'];
						done();
					});
			})

			it('should flash a message if "flashUserNotAuth" is provided', function (done) {
				agent
					.get('/login')
                    .set('Cookie', cookie)
					.expect(200, 'You are not authorized', done);
			})
		})

		it('should throw an exception if "flashUserNotAuth" is used without flash middleware', function (done) {

			var app = express();
			var passwordless = new Passwordless();
			passwordless.init(new TokenStoreMockAuthOnly());

			app.get('/restricted', passwordless.restricted({ 	notAuthRedirect: '/login',
																flashUserNotAuth: 'You are not authorized' }), 
				function(req, res){
					res.send(200, 'authenticated');
			});

			request(app)
				.get('/restricted')
				.expect(500, done);
		})

		it('should throw an exception if "flashUserNotAuth" is used without "notAuthRedirect"', function (done) {

			var app = express();
			var passwordless = new Passwordless();
			passwordless.init(new TokenStoreMockAuthOnly());

			app.use(cookieParser());
			app.use(expressSession({ secret: '42' }));

			app.use(flash());

			app.get('/restricted', passwordless.restricted({ 	flashUserNotAuth: 'You are not authorized' }), 
				function(req, res){
					res.send(200, 'authenticated');
			});

			request(app)
				.get('/restricted')
				.expect(500, done);
		})
		
		it('should return 401 if no token passed is passed at all', function (done) {

			var app = express();
			var passwordless = new Passwordless();
			passwordless.init(new TokenStoreMockAuthOnly());

			app.use(passwordless.acceptToken());

			app.get('/restricted', passwordless.restricted(),
				function(req, res){
					res.send(200, 'authenticated');
			});

			request(app)
				.get('/restricted')
				.expect(401, done);
		})

		it('should return 401 if the token passed is invalid', function (done) {

			var app = express();
			var passwordless = new Passwordless();
			passwordless.init(new TokenStoreMockAuthOnly());

			app.use(passwordless.acceptToken());

			app.get('/restricted', passwordless.restricted(),
				function(req, res){
					res.send(200, 'authenticated');
			});

			request(app)
				.get('/restricted?token=invalid')
				.expect(401, done);
		})
	})
});