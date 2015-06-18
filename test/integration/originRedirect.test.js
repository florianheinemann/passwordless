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
		describe('origin redirect', function() {

			var mocks = new Mocks();

			var app = express();
			var passwordless = new Passwordless();
			var store = new TokenStoreMock({integration:true});
			passwordless.init(store);
			passwordless.addDelivery(mocks.deliveryMockSend());

			app.use(bodyParser.json());
			app.use(bodyParser.urlencoded({extended: false}));
			app.use(cookieParser());
			app.use(expressSession({ secret: '42', resave: false, saveUninitialized:false }));

			app.use(passwordless.sessionSupport());
			app.use(passwordless.acceptToken( { enableOriginRedirect: true } ));

			app.use('/restricted', passwordless.restricted( { originField: 'origin', failureRedirect: '/login' }));

			app.get('/restricted/demo',
				function(req, res){
					res.status(200).send('authenticated');
			});

			app.get('/home',
				function(req, res){
					res.status(200).send('homepage');
			});

			app.get('/login',
				function(req, res){
					res.status(200).send(req.query.origin);
			});

			app.post('/login', passwordless.requestToken(mocks.getUserId(), { originField: 'origin' }),
				function(req, res){
					res.status(200).send();
			});

			var agent = request.agent(app);

			it('should redirect if protected resources are accessed unauthorized', function (done) {
				agent
					.get('/restricted/demo')
					.expect(302)
					.expect('location', '/login?origin=' + encodeURIComponent('/restricted/demo'), done);
			})

			it('should pass the origin param to /login', function (done) {
				agent
					.get('/login?origin=' + encodeURIComponent('/restricted/demo'))
					.expect(200, '/restricted/demo', done);
			})

			it('should verify a proper user', function (done) {
				agent
					.post('/login')
					.send( { user: mocks.alice().email, origin: '/restricted/demo' } )
					.expect(200, done);
			})

			it('should have stored and sent a token', function () {
				var lastRecord = store.lastRecord();
				expect(lastRecord).to.exist;
				expect(lastRecord.uid).to.equal(mocks.alice().id.toString());
				expect(lastRecord.origin).to.equal('/restricted/demo');

				expect(mocks.delivered.length).to.equal(1);
				expect(mocks.delivered[0].token).to.have.length.above(0);
				expect(mocks.delivered[0].uid).to.equal(mocks.alice().id);
				expect(mocks.delivered[0].recipient).to.equal(mocks.alice().email);
			})

			it('should redirect to original URL after token/uid is passed successfully', function (done) {
				agent
					.get('/home?token=' + mocks.delivered[0].token + '&uid=' + mocks.delivered[0].uid)
					.expect(302)
					.expect('location', '/restricted/demo', done);
			})
		})
	})
})