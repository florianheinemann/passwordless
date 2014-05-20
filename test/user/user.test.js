'use strict';

var expect = require('chai').expect;
var express = require('express');
var request = require('supertest');
var cookieParser = require('cookie-parser');
var expressSession = require('express-session');
var Passwordless = require('../../lib');
var TokenStoreMock = require('../mock/tokenstore');

describe('passwordless', function() {
	describe('user', function() {
		describe('sessions enabled', function(done) {

			var app = express();
			var passwordless = new Passwordless(new TokenStoreMock());

			app.use(cookieParser());
			app.use(expressSession( { secret: '42' } ));

			app.use(passwordless.sessionSupport());
				
			app.get('/protected', passwordless.authenticate(),
				function(req, res){
					res.send(200, (req.user) ? req.user : '{none}' );
			});
				
			app.get('/logout', passwordless.logout(),
				function(req, res){
					res.send(200, (req.user) ? req.user : '{none}' );
			});
				
			app.get('/not-protected',
				function(req, res){
					res.send(200, (req.user) ? req.user : '{none}' );
			});

			var agent = request.agent(app);
			var agent2 = request.agent(app);

			it('should not fill req.user if no user is logged in', function (done) {
				agent
					.get('/not-protected')
					.expect(200, '{none}', done);
			});

			it('should fill req.user right after login', function (done) {
				agent
					.get('/protected?token=marc')
					.expect(200, 'marc@example.com', done);
			});

			it('should continue filling req.user also without token after login', function (done) {
				agent
					.get('/protected')
					.expect(200, 'marc@example.com', done);
			});

			it('should continue filling req.user also without token and in non-protected pages after login', function (done) {
				agent
					.get('/not-protected')
					.expect(200, 'marc@example.com', done);
			});

			it('should not fill req.user for any other user who is not logged in', function (done) {
				agent2
					.get('/not-protected')
					.expect(200, '{none}', done);
			});

			it('should fill req.user right after login for a 2nd user', function (done) {
				agent2
					.get('/protected?token=alice')
					.expect(200, 'alice@example.com', done);
			});

			it('should still fill the correct req.user for a user even after another is logged in', function (done) {
				agent
					.get('/not-protected')
					.expect(200, 'marc@example.com', done);
			});

			it('should not fill req.user anymore right after logout', function (done) {
				agent
					.get('/logout')
					.expect(200, '{none}', done);
			});

			it('should not fill req.user anymore after logout', function (done) {
				agent
					.get('/not-protected')
					.expect(200, '{none}', done);
			});
		},

		describe('stateless', function(done) {

			var app = express();
			var passwordless = new Passwordless(new TokenStoreMock());

			app.use(cookieParser());
			app.use(expressSession( { secret: '42' } ));

			done('test not created yet');
				
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
		},

		describe('others', function(done) {

			it('can we change the name of the _user_ field?', function (done) {
				done('fail');
			}),

			it('what happens if other, new token is supplied?', function (done) {
				done('fail');
			}),

			it('what happens stateless if other, new token is supplied?', function (done) {
				done('fail');
			}),

			it('are there other cases where another token could create an issue?', function (done) {
				done('fail');
			})
		}))
	)})
})