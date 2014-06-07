'use strict';

var expect = require('chai').expect;
var express = require('express');
var request = require('supertest');
var bodyParser = require('body-parser')
var cookieParser = require('cookie-parser');
var expressSession = require('express-session');
var Passwordless = require('../../').Passwordless;
var TokenStoreMock = require('../mock/tokenstoremock');

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
			{id: 103, email: 'alice@example.com', phone: '+1-777-777-7777'}
		];

		var findUser = function(user, delivery, callback) {
			if(user === 'error') {
				return callback('Some error', null);
			}
			for (var i = userDb.length - 1; i >= 0; i--) {
				if(delivery === 'email' && userDb[i].email === user) {
					return callback(null, userDb[i].id);
				} else if(delivery === 'sms' && userDb[i].phone === user) {
					return callback(null, userDb[i].id);
				}
			};
			callback(null, null);
		}

		describe('several strategies', function() {

			var app = express();
			var passwordless = new Passwordless();
			passwordless.init(new TokenStoreMock());

			app.use(bodyParser());

			passwordless.addDelivery('email', deliveryMockSend('email'));
			passwordless.addDelivery('sms', deliveryMockSend('sms'));

			app.post('/login', passwordless.requestToken(findUser),
				function(req, res){
					res.send(200);
			});

			var agent1 = request.agent(app);
			var agent2 = request.agent(app);

			it('should return 400 if the field "delivery" is not provided', function (done) {
				agent1
					.post('/login')
					.send( { user: 'alice@example.com' } )
					.expect(400, done);
			})

			it('should not have sent or stored any tokens so far', function () {
				expect(delivered.length).to.equal(0);
			})

			it('should return 400 if the field "delivery" contains an invalid value', function (done) {
				agent1
					.post('/login')
					.send( { user: 'alice@example.com', delivery: 'snailmail' } )
					.expect(400, done);
			})

			it('should not have sent or stored any tokens so far', function () {
				expect(delivered.length).to.equal(0);
			})

			it('should deliver token for a valid delivery method', function (done) {
				agent1
					.post('/login')
					.send( { user: '+1-777-777-7777', delivery: 'sms' } )
					.expect(200, done);
			})

			it('should have sent and stored token', function () {
				expect(delivered.length).to.equal(1);
				expect(delivered[0].delivery).to.equal('sms');
			})


			it('should deliver token for a valid delivery method (2)', function (done) {
				agent2
					.post('/login')
					.send( { user: 'alice@example.com', delivery: 'email' } )
					.expect(200, done);
			})

			it('should have sent and stored token', function () {
				expect(delivered.length).to.equal(2);
				expect(delivered[1].delivery).to.equal('email');
			})
		})

		describe('option(deliveryField)', function() {

			var app = express();
			var passwordless = new Passwordless();
			passwordless.init(new TokenStoreMock());

			app.use(bodyParser());

			passwordless.addDelivery('email', deliveryMockSend('email'));
			passwordless.addDelivery('sms', deliveryMockSend('sms'));

			app.post('/login', passwordless.requestToken(findUser, {deliveryField: 'method'}),
				function(req, res){
					res.send(200);
			});

			var agent = request.agent(app);

			it('should deliver token for a valid delivery strategy', function (done) {
				delivered = [];
				agent
					.post('/login')
					.send( { user: '+1-777-777-7777', method: 'sms' } )
					.expect(200, done);
			})

			it('should have sent and stored token', function () {
				expect(delivered.length).to.equal(1);
				expect(delivered[0].delivery).to.equal('sms');
			})
		})
	})
})