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
		describe('modified time to live (ttl)', function() {

			var mocks = new Mocks();

			var app = express();
			var passwordless = new Passwordless();
			passwordless.init(new TokenStoreMock({integration:true}));
			passwordless.addDelivery('short', mocks.deliveryMockSend('short'), { ttl: 100 });
			passwordless.addDelivery('long', mocks.deliveryMockSend('long'));

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

			it('should verify a user with standard ttl', function (done) {
				agent1
					.post('/login')
					.send( { user: mocks.alice().email, delivery: 'long' } )
					.expect(200, done);
			})

			it('should have sent a token', function () {
				expect(mocks.delivered.length).to.equal(1);
				expect(mocks.delivered[0].token).to.have.length.above(0);
				expect(mocks.delivered[0].uid).to.equal(mocks.alice().id);
				expect(mocks.delivered[0].recipient).to.equal(mocks.alice().email);
				expect(mocks.delivered[0].delivery).to.equal('long');
			})

			it('should verify a user with short ttl', function (done) {
				agent2
					.post('/login')
					.send( { user: mocks.marc().email, delivery: 'short' } )
					.expect(200, done);
			})

			it('should have sent a token', function () {
				expect(mocks.delivered.length).to.equal(2);
				expect(mocks.delivered[1].token).to.have.length.above(0);
				expect(mocks.delivered[1].uid).to.equal(mocks.marc().id);
				expect(mocks.delivered[1].recipient).to.equal(mocks.marc().email);
				expect(mocks.delivered[1].delivery).to.equal('short');
			})

			it('should even after 200ms successfully log in with the standard ttl token', function (done) {
				setTimeout(function() {
					agent1
					.get('/restricted?token=' + mocks.delivered[0].token + '&uid=' + mocks.delivered[0].uid)
					.expect(200, done);				
				}, 200)
			})

			it('should reject a log in with a short ttl token after 200ms', function (done) {
				setTimeout(function() {
					agent2
					.get('/restricted?token=' + mocks.delivered[1].token + '&uid=' + mocks.delivered[1].uid)
					.expect(401, done);				
				}, 200)
			})
		})
	})
})