'use strict';

var expect = require('chai').expect;
var express = require('express');
var request = require('supertest');
var bodyParser = require('body-parser')
var cookieParser = require('cookie-parser');
var expressSession = require('express-session');
var Passwordless = require('../../lib').Passwordless;
var TokenStoreMockAuthOnly = require('../mock/tokenstoreauthonly');

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

		describe('several strategies', function() {

			var app = express();
			var passwordless = new Passwordless();
			passwordless.init(new TokenStoreMockAuthOnly());

			app.use(bodyParser());

			passwordless.add('email', deliveryMockVerify, deliveryMockSend('email'));
			passwordless.add('sms', deliveryMockVerify, deliveryMockSend('sms'));

			app.post('/login', passwordless.requestToken(),
				function(req, res){
					res.send(200);
			});

			var agent1 = request.agent(app);
			var agent2 = request.agent(app);

			it('should return 400 if the field "strategy" is not provided', function (done) {
				agent1
					.post('/login')
					.send( { email: 'alice' } )
					.expect(400, done);
			})

			it('should not have sent or stored any tokens so far', function () {
				expect(delivered.length).to.equal(0);
			})

			it('should return 400 if the field "strategy" contains an invalid value', function (done) {
				agent1
					.post('/login')
					.send( { email: 'alice', strategy: 'snailmail' } )
					.expect(400, done);
			})

			it('should not have sent or stored any tokens so far', function () {
				expect(delivered.length).to.equal(0);
			})

			it('should deliver token for a valid strategy', function (done) {
				agent1
					.post('/login')
					.send( { email: 'alice', strategy: 'sms' } )
					.expect(200, done);
			})

			it('should have sent and stored token', function () {
				expect(delivered.length).to.equal(1);
				expect(delivered[0][2]).to.equal('sms');
			})


			it('should deliver token for a valid strategy (2)', function (done) {
				agent2
					.post('/login')
					.send( { email: 'alice', strategy: 'email' } )
					.expect(200, done);
			})

			it('should have sent and stored token', function () {
				expect(delivered.length).to.equal(2);
				expect(delivered[1][2]).to.equal('email');
			})
		})

		describe('option(strategy)', function() {

			var app = express();
			var passwordless = new Passwordless();
			passwordless.init(new TokenStoreMockAuthOnly());

			app.use(bodyParser());

			passwordless.add('email', deliveryMockVerify, deliveryMockSend('email'));
			passwordless.add('sms', deliveryMockVerify, deliveryMockSend('sms'));

			app.post('/login', passwordless.requestToken({strategy: 'delivery'}),
				function(req, res){
					res.send(200);
			});

			var agent = request.agent(app);

			it('should deliver token for a valid strategy', function (done) {
				delivered = [];
				agent
					.post('/login')
					.send( { email: 'alice', delivery: 'sms' } )
					.expect(200, done);
			})

			it('should have sent and stored token', function () {
				expect(delivered.length).to.equal(1);
				expect(delivered[0][2]).to.equal('sms');
			})
		})
	})
})