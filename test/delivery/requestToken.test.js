'use strict';

var expect = require('chai').expect;
var express = require('express');
var request = require('supertest');
var bodyParser = require('body-parser')
var cookieParser = require('cookie-parser');
var expressSession = require('express-session');
var Passwordless = require('../../').Passwordless;
var TokenStoreMock = require('../mock/tokenstoremock');
var flash = require('connect-flash');

describe('passwordless', function() {
	describe('requestToken', function() {

		var delivered = [];
		var deliveryMockSend = function(name) {
			return function(tokenToSend, uid, done) {
					setTimeout(function() {
						if(uid === 107) {
							return done('error');
						}

						delivered.push({ token: tokenToSend, user: uid, delivery: name });
						done();
					}, 0);
				}
			}

		var userDb = [
			{id: 101, email: 'marc@example.com', phone: '+1-555-555-5555'},
			{id: 103, email: 'alice@example.com', phone: '+1-777-777-7777'},
			{id: 107, email: 'deliveryError@example.com', phone: '+1-888-888-8888'}
		];

		var findUser = function(user, delivery, callback) {
			if(user === 'error') {
				return callback('Some error', null);
			}
			for (var i = userDb.length - 1; i >= 0; i--) {
				if(userDb[i].email === user) {
					return callback(null, userDb[i].id);
				}
			};
			callback(null, null);
		}

		describe('default delivery', function() {

			var app = express();
			var passwordless = new Passwordless();
			var store = new TokenStoreMock();
			passwordless.init(store);

			app.use(bodyParser());

			passwordless.addDelivery(deliveryMockSend());

			app.post('/login', passwordless.requestToken(findUser),
				function(req, res){
					res.send(200);
			});

			var agent = request.agent(app);

			it('should return 400 if the field "user" is not provided', function (done) {
				agent
					.post('/login')
					.expect(400, done);
			})

			it('should not have sent or stored any tokens so far', function (done) {
				expect(delivered.length).to.equal(0);
				store.length(function(err, count) {
					expect(count).to.equal(0);
					done();
				});
			})

			it('should return 401 in case of an empty user', function (done) {
				agent
					.post('/login')
					.send( { user: '' } )
					.expect(401, done);
			})

			it('should not have sent or stored any tokens so far', function (done) {
				expect(delivered.length).to.equal(0);
				store.length(function(err, count) {
					expect(count).to.equal(0);
					done();
				});
			})

			it('should return 401 in case of an unknown user', function (done) {
				agent
					.post('/login')
					.send( { user: 'unknown@example.com' } )
					.expect(401, done);
			})

			it('should not have sent or stored any tokens so far', function (done) {
				expect(delivered.length).to.equal(0);
				store.length(function(err, count) {
					expect(count).to.equal(0);
					done();
				});
			})

			it('should return 500 in case of an error on the verification layer', function (done) {
				agent
					.post('/login')
					.send( { user: 'error' } )
					.expect(500, done);
			})

			it('should not have sent or stored any tokens so far', function (done) {
				expect(delivered.length).to.equal(0);
				store.length(function(err, count) {
					expect(count).to.equal(0);
					done();
				});
			})	

			it('should return 500 in case of an error on the delivery layer', function (done) {
				agent
					.post('/login')
					.send( { user: 'deliveryError@example.com' } )
					.expect(500, done);
			})

			it('should not have sent any tokens so far', function (done) {
				expect(delivered.length).to.equal(0);
				store.clear(function(err) {
					done();
				});
			})

			it('should verify a proper user', function (done) {
				agent
					.post('/login')
					.send( { user: 'alice@example.com' } )
					.expect(200, done);
			})

			it('should have sent and stored token', function (done) {
				expect(delivered.length).to.equal(1);
				expect(delivered[0].token).to.have.length.above(20);
				expect(delivered[0].user).to.equal(103);
				store.length(function(err, count) {
					expect(count).to.equal(1);
					store.clear(function(err) {
						done();
					});
				});
			})

			it('should verify another proper user', function (done) {
				agent
					.post('/login')
					.send( { user: 'marc@example.com' } )
					.expect(200, done);
			})

			it('should have sent and stored token', function (done) {
				expect(delivered.length).to.equal(2);
				expect(delivered[1].token).to.have.length.above(20);
				expect(delivered[1].user).to.equal(101);
				store.length(function(err, count) {
					expect(count).to.equal(1);
					store.clear(function(err) {
						done();
					});
				});
			})

			it('should create random tokens', function () {
				expect(delivered[1].token).to.not.equal(delivered[0].token);
			})
		})

		describe('different tokenAlgorithm', function() {

			var app = express();
			var passwordless = new Passwordless();
			passwordless.init(new TokenStoreMock());

			app.use(bodyParser());

			passwordless.addDelivery(deliveryMockSend(), {tokenAlgorithm: function() {return 'random'}});

			app.post('/login', passwordless.requestToken(findUser),
				function(req, res){
					res.send(200);
			});

			var agent = request.agent(app);

			it('should verify a proper user', function (done) {
				delivered = [];
				agent
					.post('/login')
					.send( { user: 'alice@example.com' } )
					.expect(200, done);
			})

			it('should have sent and stored token', function () {
				expect(delivered.length).to.equal(1);
				expect(delivered[0].token).to.equal('random');
				expect(delivered[0].user).to.equal(103);
			})
		})

		describe('not initialized', function() {

			var app = express();
			var passwordless = new Passwordless();

			app.use(bodyParser());

			passwordless.addDelivery(deliveryMockSend());

			app.post('/login', passwordless.requestToken(findUser),
				function(req, res){
					res.send(200);
			});

			var agent = request.agent(app);

			it('should throw an exception', function (done) {
				delivered = [];
				agent
					.post('/login')
					.send( { user: 'alice@example.com' } )
					.expect(500, done);
			})

			it('should not have sent a token', function () {
				expect(delivered.length).to.equal(0);
			})
		})

		describe('invalid call of requestToken - 1/2', function() {

			var app = express();
			var passwordless = new Passwordless();

			app.use(bodyParser());

			passwordless.addDelivery(deliveryMockSend());

			app.post('/login', passwordless.requestToken(),
				function(req, res){
					res.send(200);
			});

			var agent = request.agent(app);

			it('should throw an exception', function (done) {
				delivered = [];
				agent
					.post('/login')
					.send( { user: 'alice@example.com' } )
					.expect(500, done);
			})

			it('should not have sent a token', function () {
				expect(delivered.length).to.equal(0);
			})
		})

		describe('invalid call of requestToken - 2/2', function() {

			var app = express();
			var passwordless = new Passwordless();

			app.use(bodyParser());

			passwordless.addDelivery(deliveryMockSend());

			app.post('/login', passwordless.requestToken({ userField: 'email' }),
				function(req, res){
					res.send(200);
			});

			var agent = request.agent(app);

			it('should throw an exception', function (done) {
				delivered = [];
				agent
					.post('/login')
					.send( { email: 'alice@example.com' } )
					.expect(500, done);
			})

			it('should not have sent a token', function () {
				expect(delivered.length).to.equal(0);
			})
		})

		describe('requestToken(options)', function() {
			describe('option:userField', function() {
				var app = express();
				var passwordless = new Passwordless();
				passwordless.init(new TokenStoreMock());

				app.use(bodyParser());

				passwordless.addDelivery(deliveryMockSend());

				app.post('/login', passwordless.requestToken(findUser, { userField: 'phone' }),
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
						.send( { phone: 'unknown@example.com' } )
						.expect(401, done);
				})

				it('should not have sent any tokens so far', function () {
					expect(delivered.length).to.equal(0);
				})

				it('should verify a proper user', function (done) {
					agent
						.post('/login')
						.send( { phone: 'alice@example.com' } )
						.expect(200, done);
				})

				it('should have sent a token', function () {
					expect(delivered.length).to.equal(1);
					expect(delivered[0].token).to.exist;
					expect(delivered[0].user).to.equal(103);
				})
			})

			describe('option:referrer', function() {
				it('should be tested');
			});

			describe('option:allowGet', function() {
				var app = express();
				var passwordless = new Passwordless();
				passwordless.init(new TokenStoreMock());

				passwordless.addDelivery('email', deliveryMockSend('email'));
				passwordless.addDelivery('sms', deliveryMockSend('sms'));

				app.get('/login', passwordless.requestToken(findUser, { allowGet: true }),
					function(req, res){
						res.send(200);
				});

				var agent = request.agent(app);

				it('should verify a proper user', function (done) {
					delivered = [];
					agent
						.get('/login?user=alice@example.com&delivery=sms')
						.expect(200, done);
				})

				it('should have sent a token', function () {
					expect(delivered.length).to.equal(1);
					expect(delivered[0].token).to.exist;
					expect(delivered[0].user).to.equal(103);
					expect(delivered[0].delivery).to.equal('sms');
				})
			})

			describe('option:unknownUserRedirect', function() {
				var app = express();
				var passwordless = new Passwordless();
				passwordless.init(new TokenStoreMock());

				app.use(bodyParser());

				passwordless.addDelivery(deliveryMockSend());

				app.post('/login', passwordless.requestToken(findUser, { unknownUserRedirect: '/mistake' }),
					function(req, res){
						res.send(200);
				});

				var agent = request.agent(app);

				it('should redirect to /mistake if the field "user" is not provided', function (done) {
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
						.send( { user: 'unknown@example.com' } )
						.expect(302)
						.expect('location', '/mistake', done);
				})

				it('should not have sent any tokens so far', function () {
					expect(delivered.length).to.equal(0);
				})

				it('should verify a proper user', function (done) {
					agent
						.post('/login')
						.send( { user: 'alice@example.com' } )
						.expect(200, done);
				})

				it('should have sent a token', function () {
					expect(delivered.length).to.equal(1);
					expect(delivered[0].token).to.exist;
					expect(delivered[0].user).to.equal(103);
				})
			})

			describe('option:unknownUserFlash', function() {
				var app = express();
				var passwordless = new Passwordless();
				passwordless.init(new TokenStoreMock());
				passwordless.addDelivery(deliveryMockSend());

				app.use(bodyParser());

				app.use(cookieParser());
				app.use(expressSession({ secret: '42' }));

				app.use(flash());

				app.post('/login', passwordless.requestToken(findUser, { 	unknownUserRedirect: '/mistake',
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
						.send( { user: 'unknown@example.com' } )
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
				passwordless.init(new TokenStoreMock());
				passwordless.addDelivery(deliveryMockSend());

				app.use(bodyParser());

				app.use(cookieParser());
				app.use(expressSession({ secret: '42' }));

				app.post('/login', passwordless.requestToken(findUser, 
					{ unknownUserRedirect: '/mistake', unknownUserFlash: 'Provided user not valid' }),
					function(req, res){
						res.send(200);
				});

				var agent = request(app);
				var cookie;

				it('should throw an exception', function (done) {
					agent
						.post('/login')
						.send( { user: 'unknown@example.com' } )
						.expect(500, done);
				})
			})

			describe('option:unknownUserFlash (without option:unknownUserRedirect)', function() {
				var app = express();
				var passwordless = new Passwordless();
				passwordless.init(new TokenStoreMock());
				passwordless.addDelivery(deliveryMockSend());

				app.use(bodyParser());

				app.use(cookieParser());
				app.use(expressSession({ secret: '42' }));

				app.post('/login', passwordless.requestToken(findUser, { unknownUserFlash: 'Provided user not valid' }),
					function(req, res){
						res.send(200);
				});
				
				var agent = request(app);
				var cookie;

				it('should throw an exception', function (done) {
					agent
						.post('/login')
						.send( { user: 'alice@example.com' } )
						.expect(500, done);
				})
			})
		})

		describe('without bodyParser', function() {

			var app = express();
			var passwordless = new Passwordless();
			passwordless.init(new TokenStoreMock());

			passwordless.addDelivery(deliveryMockSend());

			it('should throw an exception', function (done) {

				app.post('/login', passwordless.requestToken(findUser, function(req, res){
					res.send(200);
				}));

				var agent = request.agent(app);

				agent
					.post('/login')
					.expect(500, done);
			})
		})

		describe('without added strategy', function() {

			var app = express();
			var passwordless = new Passwordless();
			passwordless.init(new TokenStoreMock());
			app.use(bodyParser());

			it('should return a 500 page', function (done) {

				app.post('/login', passwordless.requestToken(findUser, function(req, res){
					res.send(200);
				}));

				var agent = request.agent(app);
				agent
					.post('/login')
					.expect(500, done);
			})
		})
	})
})