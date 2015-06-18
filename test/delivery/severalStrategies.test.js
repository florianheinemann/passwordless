'use strict';

var expect = require('chai').expect;
var express = require('express');
var request = require('supertest');
var bodyParser = require('body-parser')
var cookieParser = require('cookie-parser');
var expressSession = require('express-session');
var Passwordless = require('../../').Passwordless;
var TokenStoreMock = require('../mock/tokenstoremock');
var Mocks = require('../mock/mocks');

describe('passwordless', function() {
	describe('requestToken', function() {

		describe('several strategies', function() {
			var mocks = new Mocks();
			var app = express();
			var passwordless = new Passwordless();
			passwordless.init(new TokenStoreMock());

			app.use(bodyParser.json());
			app.use(bodyParser.urlencoded({extended: false}));

			passwordless.addDelivery('email', mocks.deliveryMockSend('email'));
			passwordless.addDelivery('sms', mocks.deliveryMockSend('sms'));

			app.post('/login', passwordless.requestToken(mocks.getUserId()),
				function(req, res){
					res.status(200).send();
			});

			var agent1 = request.agent(app);
			var agent2 = request.agent(app);

			it('should return 400 if the field "delivery" is not provided', function (done) {
				agent1
					.post('/login')
					.send( { user: mocks.alice().email } )
					.expect(400, done);
			})

			it('should not have sent or stored any tokens so far', function () {
				expect(mocks.delivered.length).to.equal(0);
			})

			it('should return 400 if the field "delivery" contains an invalid value', function (done) {
				agent1
					.post('/login')
					.send( { user: mocks.alice().email, delivery: 'snailmail' } )
					.expect(400, done);
			})

			it('should not have sent or stored any tokens so far', function () {
				expect(mocks.delivered.length).to.equal(0);
			})

			it('should deliver token for a valid delivery method', function (done) {
				agent1
					.post('/login')
					.send( { user: mocks.alice().phone, delivery: 'sms' } )
					.expect(200, done);
			})

			it('should have sent and stored token', function () {
				expect(mocks.delivered.length).to.equal(1);
				expect(mocks.delivered[0].delivery).to.equal('sms');
			})


			it('should deliver token for a valid delivery method (2)', function (done) {
				agent2
					.post('/login')
					.send( { user: mocks.alice().email, delivery: 'email' } )
					.expect(200, done);
			})

			it('should have sent and stored token', function () {
				expect(mocks.delivered.length).to.equal(2);
				expect(mocks.delivered[1].delivery).to.equal('email');
			})
		})

		describe('option(deliveryField)', function() {
			var mocks = new Mocks();
			var app = express();
			var passwordless = new Passwordless();
			passwordless.init(new TokenStoreMock());

			app.use(bodyParser.json());
			app.use(bodyParser.urlencoded({extended: false}));

			passwordless.addDelivery('email', mocks.deliveryMockSend('email'));
			passwordless.addDelivery('sms', mocks.deliveryMockSend('sms'));

			app.post('/login', passwordless.requestToken(mocks.getUserId(), {deliveryField: 'method'}),
				function(req, res){
					res.status(200).send();
			});

			var agent = request.agent(app);

			it('should deliver token for a valid delivery strategy', function (done) {
				mocks.delivered = [];
				agent
					.post('/login')
					.send( { user: mocks.alice().phone, method: 'sms' } )
					.expect(200, done);
			})

			it('should have sent and stored token', function () {
				expect(mocks.delivered.length).to.equal(1);
				expect(mocks.delivered[0].delivery).to.equal('sms');
			})
		})
	})
})