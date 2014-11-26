'use strict';

var expect = require('chai').expect;
var express = require('express');
var request = require('supertest');
var cookieParser = require('cookie-parser');
var expressSession = require('express-session');
var cookieSession = require('cookie-session');
var Passwordless = require('../../').Passwordless;
var TokenStoreMock = require('../mock/tokenstoremock');

describe('passwordless', function() {
	describe('authenticate() [stateless test]', function() {
		describe('login and request resource without session', function(done) {

			var app = express();
			var passwordless = new Passwordless();
			passwordless.init(new TokenStoreMock());

			app.use(passwordless.acceptToken());
				
			app.get('/protected', passwordless.restricted(),
				function(req, res){
					res.status(200).send('authenticated');
			});

			var agent = request.agent(app);

			it('should return HTTP 401 for a protected URL', function (done) {
				agent
					.get('/protected')
					.expect(401, done);
			});

			it('should forward to the requested URL with valid token', function (done) {
				agent
					.get('/protected?token=valid&uid=valid')
					.expect(200, 'authenticated', done);
			});

			it('should forward to the requested URL with valid token - second try', function (done) {
				agent
					.get('/protected?token=valid&uid=valid')
					.expect(200, 'authenticated', done);
			});

			it('should still not forward to the requested URL without token', function (done) {
				agent
					.get('/protected')
					.expect(401, done);
			});
		})
	})
});