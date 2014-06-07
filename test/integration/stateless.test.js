'use strict';

var expect = require('chai').expect;
var express = require('express');
var request = require('supertest');
var bodyParser = require('body-parser')
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

		describe('stateless', function() {

			var app = express();
			var passwordless = new Passwordless();
			passwordless.init(new TokenStoreMock({integration:true}));
			passwordless.addDelivery(deliveryMockSend());

			app.use(bodyParser());

			app.use(passwordless.acceptToken());

			app.get('/unrestricted',
				function(req, res){
					res.send(200);
			});

			app.get('/restricted', passwordless.restricted(),
				function(req, res){
					res.send(200, 'authenticated');
			});

			app.post('/login', passwordless.requestToken(findUser),
				function(req, res){
					res.send(200);
			});

			app.get('/logout', passwordless.logout(),
				function(req, res){
					res.send(200);
			});

			var agent = request.agent(app);

			it('should allow access to unrestricted resources', function (done) {
				agent
					.get('/unrestricted')
					.expect(200, done);
			})

			it('should not allow access to restricted resources', function (done) {
				agent
					.get('/restricted')
					.expect(401, done);
			})

			it('should verify a proper user', function (done) {
				agent
					.post('/login')
					.send( { user: 'alice@example.com' } )
					.expect(200, done);
			})

			it('should have sent a token', function () {
				expect(delivered.length).to.equal(1);
				expect(delivered[0].token).to.have.length.above(0);
				expect(delivered[0].user).to.equal(103);
			})

			it('should still not allow access to restricted resources', function (done) {
				agent
					.get('/restricted')
					.expect(401, done);
			})

			it('should allow access to a restricted resource with a proper token', function (done) {
				agent
					.get('/restricted?token=' + delivered[0].token)
					.expect(200, done);
			})

			it('should still not allow access to a restricted resource without a token', function (done) {
				agent
					.get('/restricted')
					.expect(401, done);
			})

			it('should again allow access to a restricted resource with the same token', function (done) {
				agent
					.get('/restricted?token=' + delivered[0].token)
					.expect(200, done);
			})
		})
	})
})