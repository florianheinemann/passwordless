'use strict';

var expect = require('chai').expect;
var express = require('express');
var request = require('supertest');
var bodyParser = require('body-parser')
var cookieParser = require('cookie-parser');
var expressSession = require('express-session');
var cookieSession = require('cookie-session');
var flash = require('connect-flash');
var Passwordless = require('../../').Passwordless;
var TokenStoreMock = require('../mock/tokenstoremock');
var Mocks = require('../mock/mocks.js');

describe('passwordless', function() {
	describe('logout() [session test]', function() {
		describe('login, preserve and logout', function(done) {
			var mocks = new Mocks();
			var app = express();
			var passwordless = new Passwordless();
			var tokenStore = new TokenStoreMock();
			passwordless.init(tokenStore);
			passwordless.addDelivery(mocks.deliveryMockSend());

			app.use(bodyParser.json());
			app.use(bodyParser.urlencoded({extended: false}));

			app.use(cookieParser());
			app.use(expressSession( { secret: '42', resave: false, saveUninitialized:false } ));

			app.use(passwordless.sessionSupport());
			app.use(passwordless.acceptToken());

			app.post('/login', passwordless.requestToken(mocks.getUserId()),
				function(req, res){
					res.status(200).send();
			});
				
			app.get('/restricted', passwordless.restricted(),
				function(req, res){
					res.status(200).send('authenticated');
			});
				
			app.get('/logout', passwordless.logout(),
				function(req, res){
					res.status(200).send((req.flash) ? req.flash('passwordless-success')[0] : '');
			});

			var agent = request.agent(app);

			it('should verify a proper user', function (done) {
				agent
					.post('/login')
					.send( { user: mocks.alice().email } )
					.expect(200, done);
			})

			it('should have stored exactely one token', function (done) {
				tokenStore.length(function(err, count) {
					expect(count).to.equal(1);
					expect(err).to.not.exist;
					done();
				})
			})

			it('should forward to the requested URL with valid token', function (done) {
				agent
					.get('/restricted?token=' + mocks.delivered[0].token + '&uid=' + mocks.delivered[0].uid)
					.expect(200, 'authenticated', done);
			});

			it('should now forward to the requested URL even without token', function (done) {
				agent
					.get('/restricted')
					.expect(200, 'authenticated', done);
			});

			it('should allow logout and not display any flash message', function (done) {
				agent
					.get('/logout')
					.expect(200, '', done);
			});

			it('should not anymore allow access to restricted sites', function (done) {
				agent
					.get('/restricted')
					.expect(401, done);
			});

			it('should have deleted token from database', function (done) {
				tokenStore.length(function(err, count) {
					expect(count).to.equal(0);
					expect(err).to.not.exist;
					done();
				})
			})
		}),

		describe('success flash message', function(done) {
			var mocks = new Mocks();
			var app = express();
			var passwordless = new Passwordless();
			var tokenStore = new TokenStoreMock();
			passwordless.init(tokenStore);
			passwordless.addDelivery(mocks.deliveryMockSend());

			app.use(bodyParser.json());
			app.use(bodyParser.urlencoded({extended: false}));
			app.use(cookieParser());
			app.use(expressSession( { secret: '42', resave: false, saveUninitialized:false } ));

			app.use(flash());

			app.use(passwordless.sessionSupport());
			app.use(passwordless.acceptToken());

			app.post('/login', passwordless.requestToken(mocks.getUserId()),
				function(req, res){
					res.status(200).send();
			});
				
			app.get('/restricted', passwordless.restricted(),
				function(req, res){
					res.status(200).send('authenticated');
			});
				
			app.get('/logout', passwordless.logout({ successFlash: 'That was successful' }),
				function(req, res){
					res.status(200).send(req.flash('passwordless-success')[0]);
			});

			var agent = request.agent(app);

			it('should verify a proper user', function (done) {
				agent
					.post('/login')
					.send( { user: mocks.alice().email } )
					.expect(200, done);
			})

			it('should have stored exactely one token', function (done) {
				tokenStore.length(function(err, count) {
					expect(count).to.equal(1);
					expect(err).to.not.exist;
					done();
				})
			})

			it('should forward to the requested URL with valid token', function (done) {
				agent
					.get('/restricted?token=' + mocks.delivered[0].token + '&uid=' + mocks.delivered[0].uid)
					.expect(200, 'authenticated', done);
			});

			it('should logout and display a flash message', function (done) {
				agent
					.get('/logout')
					.expect(200, 'That was successful', done);
			});
		}),

		describe('successFlash without flash middleware', function(done) {
			var mocks = new Mocks();
			var app = express();
			var passwordless = new Passwordless();
			var tokenStore = new TokenStoreMock();
			passwordless.init(tokenStore);
			passwordless.addDelivery(mocks.deliveryMockSend());

			app.use(bodyParser.json());
			app.use(bodyParser.urlencoded({extended: false}));
			app.use(cookieParser());
			app.use(expressSession( { secret: '42', resave: false, saveUninitialized:false } ));

			app.use(passwordless.sessionSupport());
			app.use(passwordless.acceptToken());

			app.post('/login', passwordless.requestToken(mocks.getUserId()),
				function(req, res){
					res.status(200).send();
			});
				
			app.get('/restricted', passwordless.restricted(),
				function(req, res){
					res.status(200).send('authenticated');
			});
				
			app.get('/logout', passwordless.logout({ successFlash: 'That was successful' }),
				function(req, res){
					res.status(200).send();
			});

			var agent = request.agent(app);

			it('should verify a proper user', function (done) {
				agent
					.post('/login')
					.send( { user: mocks.alice().email } )
					.expect(200, done);
			})

			it('should forward to the requested URL with valid token', function (done) {
				agent
					.get('/restricted?token=' + mocks.delivered[0].token + '&uid=' + mocks.delivered[0].uid)
					.expect(200, 'authenticated', done);
			});

			it('should throw an exception', function (done) {
				agent
					.get('/logout')
					.expect(500, done);
			});
		})

		describe('logout without logged in user', function(done) {

			var app = express();
			var passwordless = new Passwordless();
			passwordless.init(new TokenStoreMock());

			app.use(cookieParser());
			app.use(expressSession( { secret: '42', resave: false, saveUninitialized:false } ));
				
			app.get('/logout', passwordless.logout(),
				function(req, res){
					res.status(200).send('logged out');
			});

			var agent = request.agent(app);

			it('should not raise any errors', function (done) {
				agent
					.get('/logout')
					.expect(200, done);
			});
		})
	})
});