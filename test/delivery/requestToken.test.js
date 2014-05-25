'use strict';

var expect = require('chai').expect;
var express = require('express');
var request = require('supertest');
var bodyParser = require('body-parser')
var cookieParser = require('cookie-parser');
var expressSession = require('express-session');
var Passwordless = require('../../lib');
var TokenStoreMock = require('../mock/tokenstore');

describe('passwordless', function() {
	describe('requestToken', function() {

		var delivered = [];
		var deliveryMockVerify = function(contactToVerify, done) {
				if(contactToVerify === 'error') {
					done('error', null);
				} else if (contactToVerify === 'unknown') {
					done(null, null);
				} else {
					done(null, 'UID/' + contactToVerify);
				}
			};

		var deliveryMockSend = function(tokenToSend, user, done) {
				if(user === 'UID/deliveryError') {
					return done('error');
				}

				delivered.push([tokenToSend, user]);
				done();
			};

		describe('default delivery', function() {

			var app = express();
			var passwordless = new Passwordless(new TokenStoreMock());

			app.use(bodyParser());

			passwordless.add(deliveryMockVerify, deliveryMockSend);

			app.post('/login', passwordless.requestToken(),
				function(req, res){
					res.send(200);
			});

			var agent = request.agent(app);

			it('should return 403 if the field "email" is not provided', function (done) {
				agent
					.post('/login')
					.expect(403, done);
			})

			it('should not have sent any tokens so far', function () {
				expect(delivered.length).to.equal(0);
			})

			it('should return 403 in case of an unknown user', function (done) {
				agent
					.post('/login')
					.send( { email: 'unknown' } )
					.expect(403, done);
			})

			it('should not have sent any tokens so far', function () {
				expect(delivered.length).to.equal(0);
			})

			it('should return 500 in case of an error on the verification layer', function (done) {
				agent
					.post('/login')
					.send( { email: 'error' } )
					.expect(500, done);
			})

			it('should not have sent any tokens so far', function () {
				expect(delivered.length).to.equal(0);
			})	

			it('should return 500 in case of an error on the delivery layer', function (done) {
				agent
					.post('/login')
					.send( { email: 'deliveryError' } )
					.expect(500, done);
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
				expect(delivered[0][0]).to.have.length.above(20);
				expect(delivered[0][1]).to.equal('UID/alice');
			})

			it('should verify another proper user', function (done) {
				agent
					.post('/login')
					.send( { email: 'mark' } )
					.expect(200, done);
			})

			it('should have sent a token', function () {
				expect(delivered.length).to.equal(2);
				expect(delivered[1][0]).to.have.length.above(20);
				expect(delivered[1][1]).to.equal('UID/mark');
			})

			it('should create random tokens', function () {
				expect(delivered[1][0]).to.not.equal(delivered[0][0]);
			})
		})

		describe('requestToken(options)', function() {
			describe('option:input', function() {
				var app = express();
				var passwordless = new Passwordless(new TokenStoreMock());

				app.use(bodyParser());

				passwordless.add(deliveryMockVerify, deliveryMockSend);

				app.post('/login', passwordless.requestToken({ input: 'phone' }),
					function(req, res){
						res.send(200);
				});

				var agent = request.agent(app);

				it('should return 403 if the field "phone" is not provided', function (done) {
					delivered = [];
					agent
						.post('/login')
						.expect(403, done);
				})

				it('should not have sent any tokens so far', function () {
					expect(delivered.length).to.equal(0);
				})

				it('should return 403 in case of an unknown user', function (done) {
					agent
						.post('/login')
						.send( { phone: 'unknown' } )
						.expect(403, done);
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

			describe('option:failureRedirect', function() {
				var app = express();
				var passwordless = new Passwordless(new TokenStoreMock());

				app.use(bodyParser());

				passwordless.add(deliveryMockVerify, deliveryMockSend);

				app.post('/login', passwordless.requestToken({ failureRedirect: '/mistake' }),
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

				it('should return 403 in case of an unknown user', function (done) {
					agent
						.post('/login')
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
		})

		describe('without bodyParser', function() {

			var app = express();
			var passwordless = new Passwordless(new TokenStoreMock());

			passwordless.add(deliveryMockVerify, deliveryMockSend);

			it('should throw an error', function (done) {

				app.post('/login', 
					function(req, res, next) {
						var request = passwordless.requestToken();
						try {
							request(req, res, next);
							done('should have thrown exception');
						} catch(err) {
							done();
						}
					},
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