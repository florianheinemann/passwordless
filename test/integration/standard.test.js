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
		describe('standard', function() {

			var mocks = new Mocks();

			var app = express();
			var passwordless = new Passwordless();
			passwordless.init(new TokenStoreMock({integration:true}));
			passwordless.addDelivery(mocks.deliveryMockSend());

			app.use(bodyParser());
			app.use(cookieParser());
			app.use(expressSession({ secret: '42', resave: false, saveUninitialized:false }));

			app.use(passwordless.sessionSupport());
			app.use(passwordless.acceptToken({ successRedirect: '/success' }));

			app.get('/unrestricted',
				function(req, res){
					res.status(200).send();
			});

			app.get('/success', passwordless.restricted(),
				function(req, res){
					res.status(200).send('successful authentication');
			});

			app.get('/restricted', passwordless.restricted(),
				function(req, res){
					res.status(200).send('restricted resource');
			});

			app.post('/login', passwordless.requestToken(mocks.getUserId()),
				function(req, res){
					res.status(200).send();
			});

			app.get('/logout', passwordless.logout(),
				function(req, res){
					res.status(200).send();
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
				expect(mocks.delivered[0].uid).to.equal(mocks.alice().id);
				expect(mocks.delivered[0].recipient).to.equal(mocks.alice().email);
			})

			it('should still not allow access to restricted resources', function (done) {
				agent
					.get('/restricted')
					.expect(401, done);
			})

			it('should allow access to a restricted resource with a proper token', function (done) {
				agent
					.get('/restricted?token=' + mocks.delivered[0].token + '&uid=' + mocks.delivered[0].uid)
					.expect(302)
					.expect('location', '/success', done);
			})

			it('should now allow access to a restricted resource without a token', function (done) {
				agent
					.get('/success')
					.expect(200, done);
			})

			it('should successfully log out', function (done) {
				agent
					.get('/logout')
					.expect(200, done);
			})

			it('should not anymore allow access to restricted resources', function (done) {
				agent
					.get('/restricted')
					.expect(401, done);
			})
		})
	})
})