// 'use strict';

// var expect = require('chai').expect;
// var express = require('express');
// var request = require('supertest');
// var passwordless = require('../lib');

// describe('passwordless', function() {
// 	describe('authenticate() - context: token supplied', function() {
// 		it('should return 403 if the token passed is empty', function (done) {

// 			var app = express();

// 			app.get('/protected', passwordless.authenticate(),
// 				function(req, res){
// 					res.send(200, 'authenticated');
// 			});

// 			request(app)
// 				.get('/protected?token=')
// 				.expect(403, done);
// 		}),
// 		it('should return 403 if the token passed is empty and redirect to "notAuthRedirect" if provided', function (done) {

// 			var app = express();

// 			app.get('/protected', passwordless.authenticate({ 	notAuthRedirect: '/login?mode=test' }),
// 				function(req, res){
// 					res.send(200, 'authenticated');
// 			});

// 			request(app)
// 				.get('/protected?id=3&token=&lang=en')
// 				.expect(302)
// 				expect('location', '/login?mode=test&lang=en', done);
// 		}),
// 		it('should flash a message if token is invalid and "flashMessage" is set to true', function (done) {

// 			var app = express();

// 			app.get('/protected', passwordless.authenticate({ 	notAuthRedirect: '/login',
// 																flashMessage: true }),
// 				function(req, res){
// 					res.send(200, 'authenticated');
// 			});

// 			request(app)
// 				.get('/protected?token=invalid')
// 				.expect(302)
// 				expect('location', '/login', done('should flash a message saying that the token is invalid'));
// 		})
// 	})
// });