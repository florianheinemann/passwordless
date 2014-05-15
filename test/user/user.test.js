// 'use strict';

// var expect = require('chai').expect;
// var express = require('express');
// var request = require('supertest');
// var Passwordless = require('../../lib');
// var TokenStoreMock = require('../mock/tokenstore');

// describe('passwordless', function() {
// 	describe('user', function() {
// 		describe('sessions enabled', function(done) {

// 			var app = express();
// 			var passwordless = new Passwordless(new TokenStoreMock());

// 			app.use(cookieParser());
// 			app.use(expressSession( { secret: '42' } ));
				
// 			app.get('/protected', passwordless.authenticate(),
// 				function(req, res){
// 					res.send(200, 'authenticated');
// 			});

// 			var agent = request.agent(app);
// 			var agent2 = request.agent(app);

// 			it('should return HTTP 403 for a protected URL', function (done) {
// 				agent
// 					.get('/protected')
// 					.expect(403, done);
// 			});

// 			it('should forward to the requested URL with valid token', function (done) {
// 				agent
// 					.get('/protected?token=valid')
// 					.expect(200, 'authenticated', done);
// 			});

// 			it('should now forward to the requested URL even without token', function (done) {
// 				agent
// 					.get('/protected')
// 					.expect(200, 'authenticated', done);
// 			});

// 			it('should not allow anyone else access to the protected resource', function (done) {
// 				agent2
// 					.get('/protected')
// 					.expect(403, done);
// 			});
// 		}


// 		describe('stateless', function(done) {

// 			var app = express();
// 			var passwordless = new Passwordless(new TokenStoreMock());

// 			app.use(cookieParser());
// 			app.use(expressSession( { secret: '42' } ));

// 			done('test not created yet');
				
// 			app.get('/protected', passwordless.authenticate(),
// 				function(req, res){
// 					res.send(200, 'authenticated');
// 			});

// 			var agent = request.agent(app);
// 			var agent2 = request.agent(app);

// 			it('should return HTTP 403 for a protected URL', function (done) {
// 				agent
// 					.get('/protected')
// 					.expect(403, done);
// 			});

// 			it('should forward to the requested URL with valid token', function (done) {
// 				agent
// 					.get('/protected?token=valid')
// 					.expect(200, 'authenticated', done);
// 			});

// 			it('should now forward to the requested URL even without token', function (done) {
// 				agent
// 					.get('/protected')
// 					.expect(200, 'authenticated', done);
// 			});

// 			it('should not allow anyone else access to the protected resource', function (done) {
// 				agent2
// 					.get('/protected')
// 					.expect(403, done);
// 			});
// 		}










// 		it('what happens if other, new token is supplied?', function (done) {
// 			done('fail');
// 		}),
// 		it('what happens stateless if other, new token is supplied?', function (done) {
// 			done('fail');
// 		}),
// 		it('are there other cases where another token could create an issue?', function (done) {
// 			done('fail');
// 		})
// 	})
// });