// 'use strict';

// var expect = require('chai').expect;
// var express = require('express');
// var request = require('supertest');
// var cookieParser = require('cookie-parser');
// var expressSession = require('express-session');
// var Passwordless = require('../../lib');
// var TokenStoreMock = require('../mock/tokenstore');

// describe('passwordless', function() {
// 	describe('delivery', function() {
// 		describe('default delivery', function() {

// 			var app = express();
// 			var passwordless = new Passwordless(new TokenStoreMock());
// 			var delivered = [];

// 			passwordless.add(
// 				function(contactToVerify, done) {
// 					if(contactToVerify === 'error') {
// 						done('error', null);
// 					} else if (contactToVerify === 'unknown') {
// 						done(null, null);
// 					} else {
// 						done(null, 'UID/' + contactToVerify);
// 					}
// 				},
// 				function(tokenToSend, user, done) {
// 					delivered.push([tokenToSend, user]);
// 					done();
// 				}
// 			);

// 			app.use(cookieParser());
// 			app.use(expressSession( { secret: '42' } ));

// 			app.use(passwordless.sessionSupport());
// 			app.use(passwordless.acceptToken());

// 			app.post('/login', passwordless.login(),
// 				function(req, res){
// 					res.send(200);
// 			});

// 			var agent = request.agent(app);

// 			it('should not verify if no user is provided', function (done) {
// 				agent
// 					.post('/login')
// 					.expect(403, done);
// 			});

// 			it('should not have sent any tokens so far', function (done) {
// 				expect(delivered.length).to.be(0);
// 			});

// 			it('should not verify in case of error', function (done) {
// 				agent
// 					.post('/login')
// 					.send( { contact: 'error' } )
// 					.expect(403, done);
// 			});

// 			it('should not have sent any tokens so far', function (done) {
// 				expect(delivered.length).to.be(0);
// 			});

// 			it('should not verify unknown user', function (done) {
// 				agent
// 					.post('/login')
// 					.send( { contact: 'unknown' } )
// 					.expect(403, done);
// 			});

// 			it('should not have sent any tokens so far', function (done) {
// 				expect(delivered.length).to.be(0);
// 			});

// 			it('should verify a proper user', function (done) {
// 				agent
// 					.post('/login')
// 					.send( { contact: 'alice' } )
// 					.expect(200, done);
// 			});

// 			it('should have sent a token', function (done) {
// 				expect(delivered.length).to.be(1);
// 				expect(delivered[0][0]).to.exist();
// 				expect(delivered[0][1]).to.equal('UID/alice');
// 			});
// 		});
// 	});
// });