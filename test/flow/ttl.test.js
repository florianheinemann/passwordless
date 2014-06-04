'use strict';

var expect = require('chai').expect;
var express = require('express');
var request = require('supertest');
var bodyParser = require('body-parser')
var cookieParser = require('cookie-parser');
var expressSession = require('express-session');
var Passwordless = require('../../').Passwordless;
var TokenStoreMock = require('../mock/tokenstore');

describe('passwordless', function() {
	describe('flow', function() {

		var delivered = [];
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

		describe('modified time to live (ttl)', function() {

			var app = express();
			var passwordless = new Passwordless();
			passwordless.init(new TokenStoreMock());
			passwordless.add('short', deliveryMockVerify, deliveryMockSend(), { ttl: 10 });
			passwordless.add('long', deliveryMockVerify, deliveryMockSend());

			app.use(bodyParser());
			app.use(cookieParser());
			app.use(expressSession({ secret: '42' }));

			app.use(passwordless.sessionSupport());
			app.use(passwordless.acceptToken());

			app.get('/restricted', passwordless.restricted(),
				function(req, res){
					res.send(200, 'authenticated');
			});

			app.post('/login', passwordless.requestToken(),
				function(req, res){
					res.send(200);
			});

			var agent1 = request.agent(app);
			var agent2 = request.agent(app);

			it('should verify a user with standard ttl', function (done) {
				agent1
					.post('/login')
					.send( { email: 'alice', strategy: 'long' } )
					.expect(200, done);
			})

			it('should have sent a token', function () {
				expect(delivered.length).to.equal(1);
				expect(delivered[0][0]).to.have.length.above(0);
				expect(delivered[0][1]).to.equal('UID/alice');
			})

			it('should verify a user with short ttl', function (done) {
				agent2
					.post('/login')
					.send( { email: 'tom', strategy: 'short' } )
					.expect(200, done);
			})

			it('should have sent a token', function () {
				expect(delivered.length).to.equal(2);
				expect(delivered[1][0]).to.have.length.above(0);
				expect(delivered[1][1]).to.equal('UID/tom');
			})

			it('should even after 1s successfully log in with the standard ttl token', function (done) {
				setTimeout(function() {
					agent1
					.get('/restricted?token=' + delivered[0][0])
					.expect(200, done);				
				}, 50)
			})

			it('should reject a log in with a short ttl token after 1s', function (done) {
				setTimeout(function() {
					agent2
					.get('/restricted?token=' + delivered[1][0])
					.expect(401, done);				
				}, 50)
			})
		})
	})
})