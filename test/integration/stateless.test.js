'use strict';

var expect = require('chai').expect;
var express = require('express');
var request = require('supertest');
var bodyParser = require('body-parser')
var Passwordless = require('../../').Passwordless;
var TokenStoreMock = require('../mock/tokenstoremock');
var Mocks = require('../mock/mocks.js');

describe('passwordless', function() {
	describe('integration', function() {
		describe('stateless', function() {

			var mocks = new Mocks();

			var app = express();
			var passwordless = new Passwordless();
			passwordless.init(new TokenStoreMock({integration:true}));
			passwordless.addDelivery(mocks.deliveryMockSend());

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

			app.post('/login', passwordless.requestToken(mocks.getUserId()),
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
					.send( { user: mocks.alice().email } )
					.expect(200, done);
			})

			it('should have sent a token', function () {
				expect(mocks.delivered.length).to.equal(1);
				expect(mocks.delivered[0].token).to.have.length.above(0);
				expect(mocks.delivered[0].user).to.equal(mocks.alice().id);
			})

			it('should still not allow access to restricted resources', function (done) {
				agent
					.get('/restricted')
					.expect(401, done);
			})

			it('should allow access to a restricted resource with a proper token', function (done) {
				agent
					.get('/restricted?token=' + mocks.delivered[0].token)
					.expect(200, done);
			})

			it('should still not allow access to a restricted resource without a token', function (done) {
				agent
					.get('/restricted')
					.expect(401, done);
			})

			it('should again allow access to a restricted resource with the same token', function (done) {
				agent
					.get('/restricted?token=' + mocks.delivered[0].token)
					.expect(200, done);
			})
		})
	})
})