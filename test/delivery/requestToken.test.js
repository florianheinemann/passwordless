'use strict';

var expect = require('chai').expect;
var express = require('express');
var request = require('supertest');
var bodyParser = require('body-parser')
var cookieParser = require('cookie-parser');
var expressSession = require('express-session');
var Passwordless = require('../../').Passwordless;
var TokenStoreMockAuthOnly = require('../mock/tokenstoreauthonly');
var flash = require('connect-flash');

describe('passwordless', function() {
	describe('requestToken', function() {

		var delivered = [];
		var lastStoredToken = null;
		var deliveryMockVerify = function(contactToVerify, done) {
				setTimeout(function() {
					if(contactToVerify === 'error') {
						done('error', null);
					} else if (contactToVerify === 'unknown') {
						done(null, null);
					} else {
						done(null, 'UID/' + contactToVerify);
					}
				}, 0);
			};

		var deliveryMockSend = function(name) {
			return function(tokenToSend, user, done) {
					setTimeout(function() {
						if(user === 'UID/deliveryError') {
							return done('error');
						}

						delivered.push([tokenToSend, user, name]);
						done();
					}, 0);
				}
			}

		describe('default delivery', function() {

			var app = express();
			var passwordless = new Passwordless();
			passwordless.init(new TokenStoreMockAuthOnly(false, function(token) {
				lastStoredToken = token;
			}));

			app.use(bodyParser());

			passwordless.add(deliveryMockVerify, deliveryMockSend());

			app.post('/login', passwordless.requestToken(),
				function(req, res){
					res.send(200);
			});

			var agent = request.agent(app);

			it('should return 400 if the field "email" is not provided', function (done) {
				agent
					.post('/login')
					.expect(400, done);
			})

			it('should not have sent or stored any tokens so far', function () {
				expect(delivered.length).to.equal(0);
				expect(lastStoredToken).to.not.exist;
			})

			it('should return 401 in case of an empty user', function (done) {
				agent
					.post('/login')
					.send( { email: '' } )
					.expect(401, done);
			})

			it('should not have sent or stored any tokens so far', function () {
				expect(delivered.length).to.equal(0);
				expect(lastStoredToken).to.not.exist;
			})

			it('should return 401 in case of an unknown user', function (done) {
				agent
					.post('/login')
					.send( { email: 'unknown' } )
					.expect(401, done);
			})

			it('should not have sent or stored any tokens so far', function () {
				expect(delivered.length).to.equal(0);
				expect(lastStoredToken).to.not.exist;
			})

			it('should return 500 in case of an error on the verification layer', function (done) {
				agent
					.post('/login')
					.send( { email: 'error' } )
					.expect(500, done);
			})

			it('should not have sent or stored any tokens so far', function () {
				expect(delivered.length).to.equal(0);
				expect(lastStoredToken).to.not.exist;
			})	

			it('should return 500 in case of an error on the delivery layer', function (done) {
				agent
					.post('/login')
					.send( { email: 'deliveryError' } )
					.expect(500, done);
			})

			it('should not have sent any tokens so far', function () {
				expect(delivered.length).to.equal(0);
				lastStoredToken = null;
			})

			it('should verify a proper user', function (done) {
				agent
					.post('/login')
					.send( { email: 'alice' } )
					.expect(200, done);
			})

			it('should have sent and stored token', function () {
				expect(delivered.length).to.equal(1);
				expect(delivered[0][0]).to.have.length.above(20);
				expect(delivered[0][1]).to.equal('UID/alice');
				expect(lastStoredToken).to.exist;
				lastStoredToken = null;
			})

			it('should verify another proper user', function (done) {
				agent
					.post('/login')
					.send( { email: 'mark' } )
					.expect(200, done);
			})

			it('should have sent and stored token', function () {
				expect(delivered.length).to.equal(2);
				expect(delivered[1][0]).to.have.length.above(20);
				expect(delivered[1][1]).to.equal('UID/mark');
				expect(lastStoredToken).to.exist;
			})

			it('should create random tokens', function () {
				expect(delivered[1][0]).to.not.equal(delivered[0][0]);
			})
		})

		describe('different tokenAlgorithm', function() {

			var app = express();
			var passwordless = new Passwordless();
			passwordless.init(new TokenStoreMockAuthOnly());

			app.use(bodyParser());

			passwordless.add(deliveryMockVerify, deliveryMockSend(), {tokenAlgorithm: function() {return 'random'}});

			app.post('/login', passwordless.requestToken(),
				function(req, res){
					res.send(200);
			});

			var agent = request.agent(app);

			it('should verify a proper user', function (done) {
				delivered = [];
				agent
					.post('/login')
					.send( { email: 'alice' } )
					.expect(200, done);
			})

			it('should have sent and stored token', function () {
				expect(delivered.length).to.equal(1);
				expect(delivered[0][0]).to.equal('random');
				expect(delivered[0][1]).to.equal('UID/alice');
			})
		})

		describe('not initialized', function() {

			var app = express();
			var passwordless = new Passwordless();

			app.use(bodyParser());

			passwordless.add(deliveryMockVerify, deliveryMockSend());

			app.post('/login', passwordless.requestToken(),
				function(req, res){
					res.send(200);
			});

			var agent = request.agent(app);

			it('should throw an exception', function (done) {
				delivered = [];
				agent
					.post('/login')
					.send( { email: 'alice' } )
					.expect(500, done);
			})

			it('should not have sent a token', function () {
				expect(delivered.length).to.equal(0);
			})
		})

		describe('requestToken(options)', function() {
			describe('option:input', function() {
				var app = express();
				var passwordless = new Passwordless();
				passwordless.init(new TokenStoreMockAuthOnly());

				app.use(bodyParser());

				passwordless.add(deliveryMockVerify, deliveryMockSend());

				app.post('/login', passwordless.requestToken({ input: 'phone' }),
					function(req, res){
						res.send(200);
				});

				var agent = request.agent(app);

				it('should return 400 if the field "phone" is not provided', function (done) {
					delivered = [];
					agent
						.post('/login')
						.expect(400, done);
				})

				it('should not have sent any tokens so far', function () {
					expect(delivered.length).to.equal(0);
				})

				it('should return 401 in case of an unknown user', function (done) {
					agent
						.post('/login')
						.send( { phone: 'unknown' } )
						.expect(401, done);
				})

				it('should not have sent any tokens so far', function () {
					expect(delivered.length).to.equal(0);
				})

				it('should verify a proper user', function (done) {
					agent
						.post('/login')
						.send( { phone: 'alice' } )
						.expect(200, done);
				})

				it('should have sent a token', function () {
					expect(delivered.length).to.equal(1);
					expect(delivered[0][0]).to.exist;
					expect(delivered[0][1]).to.equal('UID/alice');
				})
			})

			describe('option:allowGet', function() {
				var app = express();
				var passwordless = new Passwordless();
				passwordless.init(new TokenStoreMockAuthOnly());

				passwordless.add('email', deliveryMockVerify, deliveryMockSend('email'));
				passwordless.add('sms', deliveryMockVerify, deliveryMockSend('sms'));

				app.get('/login', passwordless.requestToken({ allowGet: true }),
					function(req, res){
						res.send(200);
				});

				var agent = request.agent(app);

				it('should verify a proper user', function (done) {
					delivered = [];
					agent
						.get('/login?email=alice&strategy=sms')
						.expect(200, done);
				})

				it('should have sent a token', function () {
					expect(delivered.length).to.equal(1);
					expect(delivered[0][0]).to.exist;
					expect(delivered[0][1]).to.equal('UID/alice');
					expect(delivered[0][2]).to.equal('sms');
				})
			})

			describe('option:unknownUserRedirect', function() {
				var app = express();
				var passwordless = new Passwordless();
				passwordless.init(new TokenStoreMockAuthOnly());

				app.use(bodyParser());

				passwordless.add(deliveryMockVerify, deliveryMockSend());

				app.post('/login', passwordless.requestToken({ unknownUserRedirect: '/mistake' }),
					function(req, res){
						res.send(200);
				});

				var agent = request.agent(app);

				it('should redirect to /mistake if the field "email" is not provided', function (done) {
					delivered = [];
					agent
						.post('/login')
						.expect(302)
						.expect('location', '/mistake', done);
				})

				it('should not have sent any tokens so far', function () {
					expect(delivered.length).to.equal(0);
				})

				it('should redirect to /mistake in case of an unknown user', function (done) {
					agent
						.post('/login')
						.send( { email: 'unknown' } )
						.expect(302)
						.expect('location', '/mistake', done);
				})

				it('should not have sent any tokens so far', function () {
					expect(delivered.length).to.equal(0);
				})

				it('should verify a proper user', function (done) {
					agent
						.post('/login')
						.send( { email: 'alice' } )
						.expect(200, done);
				})

				it('should have sent a token', function () {
					expect(delivered.length).to.equal(1);
					expect(delivered[0][0]).to.exist;
					expect(delivered[0][1]).to.equal('UID/alice');
				})
			})

			describe('option:unknownUserFlash', function() {
				var app = express();
				var passwordless = new Passwordless();
				passwordless.init(new TokenStoreMockAuthOnly());
				passwordless.add(deliveryMockVerify, deliveryMockSend());

				app.use(bodyParser());

				app.use(cookieParser());
				app.use(expressSession({ secret: '42' }));

				app.use(flash());

				app.post('/login', passwordless.requestToken({ unknownUserRedirect: '/mistake',
																unknownUserFlash: 'Provided user not valid' }),
					function(req, res){
						res.send(200);
				});

				app.get('/mistake',
					function(req, res) {
						res.send(200, req.flash('passwordless')[0]);
				});

				var agent = request(app);
				var cookie;

				it('should redirect to /mistake in case of an unknown user', function (done) {
					agent
						.post('/login')
						.send( { email: 'unknown' } )
						.expect(302)
						.expect('location', '/mistake')
						.end(function(err, res) {
							cookie = res.headers['set-cookie'];
							done();
						});
				})

				it('should flash a message', function (done) {
					agent
						.get('/mistake')
	                    .set('Cookie', cookie)
						.expect(200, 'Provided user not valid', done);
				})
			})

			describe('option:unknownUserFlash (without flash middleware)', function() {
				var app = express();
				var passwordless = new Passwordless();
				passwordless.init(new TokenStoreMockAuthOnly());
				passwordless.add(deliveryMockVerify, deliveryMockSend());

				app.use(bodyParser());

				app.use(cookieParser());
				app.use(expressSession({ secret: '42' }));

				app.post('/login', passwordless.requestToken({ unknownUserRedirect: '/mistake',
																unknownUserFlash: 'Provided user not valid' }),
					function(req, res){
						res.send(200);
				});

				var agent = request(app);
				var cookie;

				it('should throw an exception', function (done) {
					agent
						.post('/login')
						.send( { email: 'unknown' } )
						.expect(500, done);
				})
			})

			describe('option:unknownUserFlash (without option:unknownUserRedirect)', function() {
				var app = express();
				var passwordless = new Passwordless();
				passwordless.init(new TokenStoreMockAuthOnly());
				passwordless.add(deliveryMockVerify, deliveryMockSend());

				app.use(bodyParser());

				app.use(cookieParser());
				app.use(expressSession({ secret: '42' }));

				app.post('/login', passwordless.requestToken({ unknownUserFlash: 'Provided user not valid' }),
					function(req, res){
						res.send(200);
				});
				
				var agent = request(app);
				var cookie;

				it('should throw an exception', function (done) {
					agent
						.post('/login')
						.send( { email: 'alice' } )
						.expect(500, done);
				})
			})
		})

		describe('without bodyParser', function() {

			var app = express();
			var passwordless = new Passwordless();
			passwordless.init(new TokenStoreMockAuthOnly());

			passwordless.add(deliveryMockVerify, deliveryMockSend());

			it('should throw an exception', function (done) {

				app.post('/login', passwordless.requestToken(),
					function(req, res){
						res.send(200);
				});

				var agent = request.agent(app);

				agent
					.post('/login')
					.expect(500, done);
			})
		})

		describe('without added strategy', function() {

			var app = express();
			var passwordless = new Passwordless();
			passwordless.init(new TokenStoreMockAuthOnly());
			app.use(bodyParser());

			it('should return a 500 page', function (done) {

				app.post('/login', passwordless.requestToken(),
					function(req, res){
						res.send(200);
				});

				var agent = request.agent(app);
				agent
					.post('/login')
					.expect(500, done);
			})
		})
	})
})