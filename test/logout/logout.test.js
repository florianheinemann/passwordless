'use strict';

var expect = require('chai').expect;
var express = require('express');
var request = require('supertest');
var cookieParser = require('cookie-parser');
var expressSession = require('express-session');
var cookieSession = require('cookie-session');
var Passwordless = require('../../lib');
var TokenStoreMock = require('../mock/tokenstore');

describe('passwordless', function() {
	describe('logout() [session test]', function() {
		describe('login, preserve and logout', function(done) {

			var app = express();
			var passwordless = new Passwordless(new TokenStoreMock());

			app.use(cookieParser());
			app.use(expressSession( { secret: '42' } ));

			app.use(passwordless.sessionSupport());
			app.use(passwordless.acceptToken());
				
			app.get('/restricted', passwordless.restricted(),
				function(req, res){
					res.send(200, 'authenticated');
			});
				
			app.get('/logout', passwordless.logout(),
				function(req, res){
					res.send(200, 'logged out');
			});

			var agent = request.agent(app);

			it('should forward to the requested URL with valid token', function (done) {
				agent
					.get('/restricted?token=valid')
					.expect(200, 'authenticated', done);
			});

			it('should now forward to the requested URL even without token', function (done) {
				agent
					.get('/restricted')
					.expect(200, 'authenticated', done);
			});

			it('should allow logout', function (done) {
				agent
					.get('/logout')
					.expect(200, 'logged out', done);
			});

			it('should not anymore allow access to restricted sites', function (done) {
				agent
					.get('/restricted')
					.expect(403, done);
			});
		}),
		describe('logout without logged in user', function(done) {

			var app = express();
			var passwordless = new Passwordless(new TokenStoreMock());

			app.use(cookieParser());
			app.use(expressSession( { secret: '42' } ));
				
			app.get('/logout', passwordless.logout(),
				function(req, res){
					res.send(200, 'logged out');
			});

			var agent = request.agent(app);

			it('should not raise any errors', function (done) {
				agent
					.get('/logout')
					.expect(200, done);
			});
		})
	})
});