'use strict';

var expect = require('chai').expect;
var express = require('express');
var request = require('supertest');
var cookieParser = require('cookie-parser');
var expressSession = require('express-session');
var cookieSession = require('cookie-session');
var Passwordless = require('../lib');
var AuthDataStoreMock = require('./mock/authdatastore');

describe('passwordless', function() {
	describe('authenticate() [session test]', function() {
		describe('login and preserve', function(done) {

			var app = express();
			var passwordless = new Passwordless(new AuthDataStoreMock());

			app.use(cookieParser());
			app.use(expressSession( { secret: '42' } ));
				
			app.get('/protected', passwordless.authenticate(),
				function(req, res){
					res.send(200, 'authenticated');
			});

			var agent = request.agent(app);
			var agent2 = request.agent(app);

			it('should return HTTP 403 for a protected URL', function (done) {
				agent
					.get('/protected')
					.expect(403, done);
			});

			it('should forward to the requested URL with valid token', function (done) {
				agent
					.get('/protected?token=valid')
					.expect(200, 'authenticated', done);
			});

			it('should now forward to the requested URL even without token', function (done) {
				agent
					.get('/protected')
					.expect(200, 'authenticated', done);
			});

			it('should not allow anyone else access to the protected resource', function (done) {
				agent2
					.get('/protected')
					.expect(403, done);
			});
		}),
		describe('session middleware not initialized', function(done) {
			it('should...?', function (done) {
				done('should it throw error?');
			});
		})
	})
});