'use strict';

var expect = require('chai').expect;
var express = require('express');
var request = require('supertest');
var bodyParser = require('body-parser')
var cookieParser = require('cookie-parser');
var expressSession = require('express-session');
var Passwordless = require('../../').Passwordless;
var TokenStoreMock = require('../mock/tokenstoremock');
var Mocks = require('../mock/mocks.js');

describe('passwordless', function() {
	describe('integration', function() {
		describe('two different delivery methods', function() {

			var mocks = new Mocks();

			var app = express();
			var passwordless = new Passwordless();
			passwordless.init(new TokenStoreMock({integration:true}));
			passwordless.addDelivery('email', mocks.deliveryMockSend('email'));
			passwordless.addDelivery('sms', mocks.deliveryMockSend('sms'));

			app.use(bodyParser.json());
			app.use(bodyParser.urlencoded({extended: false}));
			app.use(cookieParser());
			app.use(expressSession({ secret: '42', resave: false, saveUninitialized:false }));

			app.use(passwordless.sessionSupport());
			app.use(passwordless.acceptToken());

			app.get('/restricted', passwordless.restricted(),
				function(req, res){
					res.status(200).send('authenticated');
			});

			app.post('/login', passwordless.requestToken(mocks.getUserId()),
				function(req, res){
					res.status(200).send();
			});

			var agent1 = request.agent(app);
			var agent2 = request.agent(app);

			it('should verify a user via email', function (done) {
				agent1
					.post('/login')
					.send( { user: mocks.alice().email, delivery: 'email' } )
					.expect(200, done);
			})

			it('should have sent a token', function () {
				expect(mocks.delivered.length).to.equal(1);
				expect(mocks.delivered[0].token).to.have.length.above(0);
				expect(mocks.delivered[0].uid).to.equal(mocks.alice().id);
				expect(mocks.delivered[0].recipient).to.equal(mocks.alice().email);
				expect(mocks.delivered[0].delivery).to.equal('email');
			})

			it('should verify a user via sms', function (done) {
				agent2
					.post('/login')
					.send( { user: mocks.marc().phone, delivery: 'sms' } )
					.expect(200, done);
			})

			it('should have sent a token', function () {
				expect(mocks.delivered.length).to.equal(2);
				expect(mocks.delivered[1].token).to.have.length.above(0);
				expect(mocks.delivered[1].uid).to.equal(mocks.marc().id);
				expect(mocks.delivered[1].recipient).to.equal(mocks.marc().phone);
				expect(mocks.delivered[1].delivery).to.equal('sms');
			})

			it('should still not allow access to restricted resources - 1/2', function (done) {
				agent1
					.get('/restricted')
					.expect(401, done);
			})

			it('should still not allow access to restricted resources - 2/2', function (done) {
				agent2
					.get('/restricted')
					.expect(401, done);
			})

			it('should allow access to a restricted resource with a proper token - 1/2', function (done) {
				agent1
					.get('/restricted?token=' + mocks.delivered[0].token + '&uid=' + mocks.delivered[0].uid)
					.expect(200, done);
			})

			it('should allow access to a restricted resource with a proper token - 2/2', function (done) {
				agent2
					.get('/restricted?token=' + mocks.delivered[1].token + '&uid=' + mocks.delivered[1].uid)
					.expect(200, done);
			})

			it('should now allow access to a restricted resource without a token - 1/2', function (done) {
				agent1
					.get('/restricted')
					.expect(200, done);
			})

			it('should now allow access to a restricted resource without a token - 2/2', function (done) {
				agent2
					.get('/restricted')
					.expect(200, done);
			})
		})
	})
})