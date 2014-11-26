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
var Mocks = require('../mock/mocks');

describe('passwordless', function() {
	describe('requestToken', function() {
		describe('default delivery', function() {

			var mocks = new Mocks();

			var app = express();
			var passwordless = new Passwordless();
			var store = new TokenStoreMock();
			passwordless.init(store);

			app.use(bodyParser());

			passwordless.addDelivery(mocks.deliveryMockSend());

			app.post('/login', passwordless.requestToken(mocks.getUserId()),
				function(req, res){
					res.status(200).send(req.passwordless.uidToAuth.toString());
			});

			var agent = request.agent(app);

			it('should return 400 if the field "user" is not provided', function (done) {
				agent
					.post('/login')
					.expect(400, done);
			})

			it('should not have sent or stored any tokens so far', function (done) {
				expect(mocks.delivered.length).to.equal(0);
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
				expect(mocks.delivered.length).to.equal(0);
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
				expect(mocks.delivered.length).to.equal(0);
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
				expect(mocks.delivered.length).to.equal(0);
				store.length(function(err, count) {
					expect(count).to.equal(0);
					done();
				});
			})	

			it('should return 500 in case of an error on the delivery layer', function (done) {
				agent
					.post('/login')
					.send( { user: mocks.deliveryError().email } )
					.expect(500, done);
			})

			it('should not have sent any tokens so far', function (done) {
				expect(mocks.delivered.length).to.equal(0);
				store.clear(function(err) {
					done();
				});
			})

			it('should verify a proper user and set req.passwordless.uidToAuth to the user\'s UID', function (done) {
				agent
					.post('/login')
					.send( { user: mocks.alice().email } )
					.expect(200, mocks.alice().id.toString(), done);
			})

			it('should have sent and stored token', function (done) {
				expect(mocks.delivered.length).to.equal(1);
				expect(mocks.delivered[0].token).to.have.length.above(20);
				expect(mocks.delivered[0].uid).to.equal(mocks.alice().id);
				expect(mocks.delivered[0].recipient).to.equal(mocks.alice().email);
				store.length(function(err, count) {
					expect(count).to.equal(1);
					store.clear(function(err) {
						done();
					});
				});
			})

			it('should verify another proper user and set req.passwordless.uidToAuth to the user\'s UID', function (done) {
				agent
					.post('/login')
					.send( { user: mocks.marc().email } )
					.expect(200, mocks.marc().id.toString(), done);
			})

			it('should have sent and stored token', function (done) {
				expect(mocks.delivered.length).to.equal(2);
				expect(mocks.delivered[1].token).to.have.length.above(20);
				expect(mocks.delivered[1].uid).to.equal(mocks.marc().id);
				expect(mocks.delivered[1].recipient).to.equal(mocks.marc().email);
				store.length(function(err, count) {
					expect(count).to.equal(1);
					store.clear(function(err) {
						done();
					});
				});
			})

			it('should create random tokens', function () {
				expect(mocks.delivered[1].token).to.not.equal(mocks.delivered[0].token);
			})
		})

		describe('passing of request object', function() {

			var mocks = new Mocks();

			var app = express();
			var passwordless = new Passwordless();
			var store = new TokenStoreMock();
			passwordless.init(store);

			app.use(bodyParser());

			passwordless.addDelivery(mocks.deliveryMockSend());

			app.post('/login', passwordless.requestToken(mocks.getUserId()),
				function(req, res){
					res.status(200).send(req.passwordless.uidToAuth.toString());
			});

			var agent = request.agent(app);

			it('should verify a proper user and set req.passwordless.uidToAuth to the user\'s UID', function (done) {
				agent
					.post('/login')
					.send( { user: mocks.alice().email, age: '32' } )
					.expect(200, mocks.alice().id.toString(), done);
			})

			it('should have passed the request object to the getUserId function', function (done) {
				expect(mocks.request.body['age']).to.equal('32');
				done();
			})
		})

		describe('different tokenAlgorithm', function() {

			var mocks = new Mocks();

			var app = express();
			var passwordless = new Passwordless();
			passwordless.init(new TokenStoreMock());

			app.use(bodyParser());

			passwordless.addDelivery(mocks.deliveryMockSend(), {tokenAlgorithm: function() {return 'random'}});

			app.post('/login', passwordless.requestToken(mocks.getUserId()),
				function(req, res){
					res.status(200).send(req.passwordless.uidToAuth.toString());
			});

			var agent = request.agent(app);

			it('should verify a proper user and set req.passwordless.uidToAuth to the user\'s UID', function (done) {
				mocks.delivered = [];
				agent
					.post('/login')
					.send( { user: mocks.alice().email } )
					.expect(200, mocks.alice().id.toString(), done);
			})

			it('should have sent and stored token', function () {
				expect(mocks.delivered.length).to.equal(1);
				expect(mocks.delivered[0].token).to.equal('random');
				expect(mocks.delivered[0].uid).to.equal(mocks.alice().id);
			})
		})

		describe('addDelivery option: numberToken', function() {

			var mocks = new Mocks();

			var app = express();
			var passwordless = new Passwordless();
			passwordless.init(new TokenStoreMock());

			app.use(bodyParser());

			passwordless.addDelivery(mocks.deliveryMockSend(), {
				numberToken: { max: 9999 }
			});

			app.post('/login', passwordless.requestToken(mocks.getUserId()),
				function(req, res){
					res.status(200).send(req.passwordless.uidToAuth.toString());
			});

			var agent = request.agent(app);

			it('should verify a proper user and set req.passwordless.uidToAuth to the user\'s UID', function (done) {
				mocks.delivered = [];
				agent
					.post('/login')
					.send( { user: mocks.alice().email } )
					.expect(200, mocks.alice().id.toString(), done);
			})

			it('should have sent and stored token', function () {
				expect(mocks.delivered.length).to.equal(1);
				expect(mocks.delivered[0].token).to.be.within(0, 9999);
				expect(mocks.delivered[0].uid).to.equal(mocks.alice().id);
			})
		})

		describe('not initialized', function() {

			var mocks = new Mocks();

			var app = express();
			var passwordless = new Passwordless();

			app.use(bodyParser());

			passwordless.addDelivery(mocks.deliveryMockSend());

			app.post('/login', passwordless.requestToken(mocks.getUserId()),
				function(req, res){
					res.status(200).send();
			});

			var agent = request.agent(app);

			it('should throw an exception', function (done) {
				mocks.delivered = [];
				agent
					.post('/login')
					.send( { user: mocks.alice().email } )
					.expect(500, done);
			})

			it('should not have sent a token', function () {
				expect(mocks.delivered.length).to.equal(0);
			})
		})

		describe('invalid call of requestToken - 1/2', function() {

			var mocks = new Mocks();

			var app = express();
			var passwordless = new Passwordless();

			app.use(bodyParser());

			passwordless.addDelivery(mocks.deliveryMockSend());

			app.post('/login', passwordless.requestToken(),
				function(req, res){
					res.status(200).send();
			});

			var agent = request.agent(app);

			it('should throw an exception', function (done) {
				mocks.delivered = [];
				agent
					.post('/login')
					.send( { user: mocks.alice().email } )
					.expect(500, done);
			})

			it('should not have sent a token', function () {
				expect(mocks.delivered.length).to.equal(0);
			})
		})

		describe('invalid call of requestToken - 2/2', function() {

			var mocks = new Mocks();

			var app = express();
			var passwordless = new Passwordless();

			app.use(bodyParser());

			passwordless.addDelivery(mocks.deliveryMockSend());

			app.post('/login', passwordless.requestToken({ userField: 'email' }),
				function(req, res){
					res.status(200).send();
			});

			var agent = request.agent(app);

			it('should throw an exception', function (done) {
				mocks.delivered = [];
				agent
					.post('/login')
					.send( { email: mocks.alice().email } )
					.expect(500, done);
			})

			it('should not have sent a token', function () {
				expect(mocks.delivered.length).to.equal(0);
			})
		})

		describe('requestToken(options)', function() {

			describe('option:originField', function() {
				describe('without provided originField', function() {
					var mocks = new Mocks();
					var app = express();
					var passwordless = new Passwordless();
					var store = new TokenStoreMock();
					passwordless.init(store);

					app.use(bodyParser());

					passwordless.addDelivery(mocks.deliveryMockSend());

					app.post('/login', passwordless.requestToken(mocks.getUserId(), { }),
						function(req, res){
							res.status(200).send(req.passwordless.uidToAuth.toString());
					});

					var agent = request.agent(app);

					it('should verify a proper user and set req.passwordless.uidToAuth to the user\'s UID', function (done) {
						agent
							.post('/login')
							.send( { user: mocks.alice().email, origin: 'http://www.example.com/origin/' } )
							.expect(200, mocks.alice().id.toString(), done);
					})

					it('should not have stored the origin URL', function () {
						var lastRecord = store.lastRecord();
						expect(lastRecord).to.exist;
						expect(lastRecord.uid).to.equal(mocks.alice().id.toString());
						expect(lastRecord.origin).to.not.eixst;
					})
				})

				describe('with provided originField', function() {
					var mocks = new Mocks();
					var app = express();
					var passwordless = new Passwordless();
					var store = new TokenStoreMock();
					passwordless.init(store);

					app.use(bodyParser());

					passwordless.addDelivery(mocks.deliveryMockSend());

					app.post('/login', passwordless.requestToken(mocks.getUserId(), { originField: 'origin' }),
						function(req, res){
							res.status(200).send(req.passwordless.uidToAuth.toString());
					});

					var agent = request.agent(app);

					var origin = 'http://www.example.com/origin/';
					it('should verify a proper user and set req.passwordless.uidToAuth to the user\'s UID', function (done) {
						agent
							.post('/login')
							.send( { user: mocks.alice().email, origin: origin } )
							.expect(200, mocks.alice().id.toString(), done);
					})

					it('should not have stored the origin URL', function () {
						var lastRecord = store.lastRecord();
						expect(lastRecord).to.exist;
						expect(lastRecord.uid).to.equal(mocks.alice().id.toString());
						expect(lastRecord.origin).to.equal(origin);
					})					
				})
			})

			describe('option:userField', function() {
				var mocks = new Mocks();
				var app = express();
				var passwordless = new Passwordless();
				passwordless.init(new TokenStoreMock());

				app.use(bodyParser());

				passwordless.addDelivery(mocks.deliveryMockSend());

				app.post('/login', passwordless.requestToken(mocks.getUserId(), { userField: 'phone' }),
					function(req, res){
						res.status(200).send(req.passwordless.uidToAuth.toString());
				});

				var agent = request.agent(app);

				it('should return 400 if the field "phone" is not provided', function (done) {
					mocks.delivered = [];
					agent
						.post('/login')
						.expect(400, done);
				})

				it('should not have sent any tokens so far', function () {
					expect(mocks.delivered.length).to.equal(0);
				})

				it('should return 401 in case of an unknown user', function (done) {
					agent
						.post('/login')
						.send( { phone: 'unknown@example.com' } )
						.expect(401, done);
				})

				it('should not have sent any tokens so far', function () {
					expect(mocks.delivered.length).to.equal(0);
				})

				it('should verify a proper user and set req.passwordless.uidToAuth to the user\'s UID', function (done) {
					agent
						.post('/login')
						.send( { phone: mocks.alice().phone } )
						.expect(200, mocks.alice().id.toString(), done);
				})

				it('should have sent a token', function () {
					expect(mocks.delivered.length).to.equal(1);
					expect(mocks.delivered[0].token).to.exist;
					expect(mocks.delivered[0].uid).to.equal(mocks.alice().id);
					expect(mocks.delivered[0].recipient).to.equal(mocks.alice().phone);
				})
			})

			describe('option:allowGet', function() {
				var mocks = new Mocks();
				var app = express();
				var passwordless = new Passwordless();
				passwordless.init(new TokenStoreMock());
				app.use(bodyParser());

				passwordless.addDelivery('email', mocks.deliveryMockSend('email'));
				passwordless.addDelivery('sms', mocks.deliveryMockSend('sms'));

				app.get('/login', passwordless.requestToken(mocks.getUserId(), { allowGet: true }),
					function(req, res){
						res.status(200).send(req.passwordless.uidToAuth.toString());
				});

				var agent = request.agent(app);

				it('should verify a proper user and set req.passwordless.uidToAuth to the user\'s UID', function (done) {
					mocks.delivered = [];
					agent
						.get('/login?user=' + encodeURIComponent(mocks.alice().phone) + '&delivery=sms')
						.send( { random: 'data' }) // ensuring POST data does trigger POST anlaysis
						.expect(200, mocks.alice().id.toString(), done);
				})

				it('should have sent a token', function () {
					expect(mocks.delivered.length).to.equal(1);
					expect(mocks.delivered[0].token).to.exist;
					expect(mocks.delivered[0].uid).to.equal(mocks.alice().id);
					expect(mocks.delivered[0].recipient).to.equal(mocks.alice().phone);
					expect(mocks.delivered[0].delivery).to.equal('sms');
				})
			})

			describe('option:failureRedirect', function() {
				var mocks = new Mocks();
				var app = express();
				var passwordless = new Passwordless();
				passwordless.init(new TokenStoreMock());

				app.use(bodyParser());

				passwordless.addDelivery(mocks.deliveryMockSend());

				app.post('/login', passwordless.requestToken(mocks.getUserId(), { failureRedirect: '/mistake' }),
					function(req, res){
						res.status(200).send(req.passwordless.uidToAuth.toString());
				});

				var agent = request.agent(app);

				it('should redirect to /mistake if the field "user" is not provided', function (done) {
					mocks.delivered = [];
					agent
						.post('/login')
						.expect(302)
						.expect('location', '/mistake', done);
				})

				it('should not have sent any tokens so far', function () {
					expect(mocks.delivered.length).to.equal(0);
				})

				it('should redirect to /mistake in case of an unknown user', function (done) {
					agent
						.post('/login')
						.send( { user: 'unknown@example.com' } )
						.expect(302)
						.expect('location', '/mistake', done);
				})

				it('should not have sent any tokens so far', function () {
					expect(mocks.delivered.length).to.equal(0);
				})

				it('should verify a proper user and set req.passwordless.uidToAuth to the user\'s UID', function (done) {
					agent
						.post('/login')
						.send( { user: mocks.alice().email } )
						.expect(200, mocks.alice().id.toString(), done);
				})

				it('should have sent a token', function () {
					expect(mocks.delivered.length).to.equal(1);
					expect(mocks.delivered[0].token).to.exist;
					expect(mocks.delivered[0].uid).to.equal(mocks.alice().id);
					expect(mocks.delivered[0].recipient).to.equal(mocks.alice().email);
				})
			})

			describe('option:failureFlash', function() {
				var mocks = new Mocks();
				var app = express();
				var passwordless = new Passwordless();
				passwordless.init(new TokenStoreMock());
				passwordless.addDelivery(mocks.deliveryMockSend());

				app.use(bodyParser());

				app.use(cookieParser());
				app.use(expressSession({ secret: '42', resave: false, saveUninitialized:false }));

				app.use(flash());

				app.post('/login', passwordless.requestToken(mocks.getUserId(), { 	failureRedirect: '/mistake',
						failureFlash: 'Provided user not valid' }),
					function(req, res){
						res.status(200).send();
				});

				app.get('/mistake',
					function(req, res) {
						res.status(200).send(req.flash('passwordless')[0]);
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

			describe('option:failureFlash (without flash middleware)', function() {
				var mocks = new Mocks();
				var app = express();
				var passwordless = new Passwordless();
				passwordless.init(new TokenStoreMock());
				passwordless.addDelivery(mocks.deliveryMockSend());

				app.use(bodyParser());

				app.use(cookieParser());
				app.use(expressSession({ secret: '42', resave: false, saveUninitialized:false }));

				app.post('/login', passwordless.requestToken(mocks.getUserId(), 
					{ failureRedirect: '/mistake', failureFlash: 'Provided user not valid' }),
					function(req, res){
						res.status(200).send();
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

			describe('option:failureFlash (without option:failureRedirect)', function() {
				var mocks = new Mocks();
				var app = express();
				var passwordless = new Passwordless();
				passwordless.init(new TokenStoreMock());
				passwordless.addDelivery(mocks.deliveryMockSend());

				app.use(bodyParser());

				app.use(cookieParser());
				app.use(expressSession({ secret: '42', resave: false, saveUninitialized:false }));

				app.post('/login', passwordless.requestToken(mocks.getUserId(), { failureFlash: 'Provided user not valid' }),
					function(req, res){
						res.status(200).send();
				});
				
				var agent = request(app);
				var cookie;

				it('should throw an exception', function (done) {
					agent
						.post('/login')
						.send( { user: mocks.alice().email } )
						.expect(500, done);
				})
			})

			describe('option:successFlash', function() {
				var mocks = new Mocks();
				var app = express();
				var passwordless = new Passwordless();
				var store = new TokenStoreMock();
				passwordless.init(store);

				app.use(bodyParser());

				app.use(cookieParser());
				app.use(expressSession({ secret: '42', resave: false, saveUninitialized:false }));

				app.use(flash());

				passwordless.addDelivery(mocks.deliveryMockSend());

				app.post('/login', passwordless.requestToken(mocks.getUserId(), { successFlash: 'All good!' }),
					function(req, res){
						res.status(200).send(req.flash('passwordless-success')[0]);
				});

				var agent = request.agent(app);

				it('should verify a proper user flash a success message', function (done) {
					agent
						.post('/login')
						.send( { user: mocks.alice().email } )
						.expect(200, 'All good!', done);
				})				
			})

			describe('option:successFlash (without flash middleware)', function() {
				var mocks = new Mocks();
				var app = express();
				var passwordless = new Passwordless();
				var store = new TokenStoreMock();
				passwordless.init(store);

				app.use(bodyParser());

				app.use(cookieParser());
				app.use(expressSession({ secret: '42', resave: false, saveUninitialized:false }));

				passwordless.addDelivery(mocks.deliveryMockSend());

				app.post('/login', passwordless.requestToken(mocks.getUserId(), { successFlash: 'All good!' }),
					function(req, res){
						res.status(200).send((req.flash) ? req.flash('passwordless-success')[0] : '');
				});

				var agent = request.agent(app);

				it('should throw an exception', function (done) {
					agent
						.post('/login')
						.send( { user: mocks.alice().email } )
						.expect(500, done);
				})				
			})
		})

		describe('without bodyParser', function() {
			var mocks = new Mocks();
			var app = express();
			var passwordless = new Passwordless();
			passwordless.init(new TokenStoreMock());

			passwordless.addDelivery(mocks.deliveryMockSend());

			it('should throw an exception', function (done) {

				app.post('/login', passwordless.requestToken(mocks.getUserId(), function(req, res){
					res.status(200).send();
				}));

				var agent = request.agent(app);

				agent
					.post('/login')
					.expect(500, done);
			})
		})

		describe('without added strategy', function() {
			var mocks = new Mocks();
			var app = express();
			var passwordless = new Passwordless();
			passwordless.init(new TokenStoreMock());
			app.use(bodyParser());

			it('should return a 500 page', function (done) {

				app.post('/login', passwordless.requestToken(mocks.getUserId(), function(req, res){
					res.status(200).send();
				}));

				var agent = request.agent(app);
				agent
					.post('/login')
					.expect(500, done);
			})
		})
	})
})