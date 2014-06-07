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
	describe('integration', function() {

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
				if(userDb[i].email === user) {
					return callback(null, userDb[i].id);
				}
			};
			callback(null, null);
		}

		describe('modified time to live (ttl)', function() {

			var app = express();
			var passwordless = new Passwordless();
			passwordless.init(new TokenStoreMock({integration:true}));
			passwordless.addDelivery('short', deliveryMockSend('short'), { ttl: 100 });
			passwordless.addDelivery('long', deliveryMockSend('long'));

			app.use(bodyParser());
			app.use(cookieParser());
			app.use(expressSession({ secret: '42' }));

			app.use(passwordless.sessionSupport());
			app.use(passwordless.acceptToken());

			app.get('/restricted', passwordless.restricted(),
				function(req, res){
					res.send(200, 'authenticated');
			});

			app.post('/login', passwordless.requestToken(findUser),
				function(req, res){
					res.send(200);
			});

			var agent1 = request.agent(app);
			var agent2 = request.agent(app);

			it('should verify a user with standard ttl', function (done) {
				agent1
					.post('/login')
					.send( { user: 'alice@example.com', delivery: 'long' } )
					.expect(200, done);
			})

			it('should have sent a token', function () {
				expect(delivered.length).to.equal(1);
				expect(delivered[0].token).to.have.length.above(0);
				expect(delivered[0].user).to.equal(103);
				expect(delivered[0].delivery).to.equal('long');
			})

			it('should verify a user with short ttl', function (done) {
				agent2
					.post('/login')
					.send( { user: 'marc@example.com', delivery: 'short' } )
					.expect(200, done);
			})

			it('should have sent a token', function () {
				expect(delivered.length).to.equal(2);
				expect(delivered[1].token).to.have.length.above(0);
				expect(delivered[1].user).to.equal(101);
				expect(delivered[1].delivery).to.equal('short');
			})

			it('should even after 200ms successfully log in with the standard ttl token', function (done) {
				setTimeout(function() {
					agent1
					.get('/restricted?token=' + delivered[0].token)
					.expect(200, done);				
				}, 200)
			})

			it('should reject a log in with a short ttl token after 200ms', function (done) {
				setTimeout(function() {
					agent2
					.get('/restricted?token=' + delivered[1].token)
					.expect(401, done);				
				}, 200)
			})
		})
	})
})