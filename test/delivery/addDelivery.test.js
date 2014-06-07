'use strict';

var expect = require('chai').expect;
var express = require('express');
var request = require('supertest');
var cookieParser = require('cookie-parser');
var expressSession = require('express-session');
var Passwordless = require('../../').Passwordless;
var TokenStoreMock = require('../mock/tokenstoremock');

describe('passwordless', function() {
	describe('addDelivery', function() {

		var deliveryMockSend = function(tokenToSend, user, done) {
				setTimeout(function() {
					delivered.push({ token: tokenToSend, user: user });
					done();
				}, 0);
			};

		it('shall work with correct default usage', function () {
			var passwordless = new Passwordless();
			passwordless.init(new TokenStoreMock());
			passwordless.addDelivery(deliveryMockSend);
		});

		it('shall work with correct default usage incl. options', function () {
			var passwordless = new Passwordless();
			passwordless.init(new TokenStoreMock());
			passwordless.addDelivery(deliveryMockSend, {ttl: 1000});
		});

		it('shall throw an Error if parameter is missing - 1/2', function () {
			var passwordless = new Passwordless();
			passwordless.init(new TokenStoreMock());
			expect(function() {
				passwordless.addDelivery()
			}).to.throw(Error);
		});

		it('shall throw an Error if parameter is missing - 2/2', function () {
			var passwordless = new Passwordless();
			passwordless.init(new TokenStoreMock());
			expect(function() {
				passwordless.addDelivery('email')
			}).to.throw(Error);
		});

		it('shall throw an Error if options:ttl is of wrong format', function () {
			var passwordless = new Passwordless();
			passwordless.init(new TokenStoreMock());
			expect(function() {
				passwordless.addDelivery('email', deliveryMockSend, {ttl: '10'})
			}).to.throw(Error);
		});

		it('shall throw an Error if options:tokenAlgorithm is of wrong format', function () {
			var passwordless = new Passwordless();
			passwordless.init(new TokenStoreMock());
			expect(function() {
				passwordless.addDelivery('email', deliveryMockSend, {tokenAlgorithm: '10'})
			}).to.throw(Error);
		});

		it('shall throw an Error if a second default delivery method is added', function () {
			var passwordless = new Passwordless();
			passwordless.init(new TokenStoreMock());
			passwordless.addDelivery(deliveryMockSend);
			expect(function() {
				passwordless.addDelivery(deliveryMockSend)
			}).to.throw(Error);
		});

		it('shall work with correct named delivery method usage', function () {
			var passwordless = new Passwordless();
			passwordless.init(new TokenStoreMock());
			passwordless.addDelivery('email', deliveryMockSend);
		});

		it('shall work with correct named delivery method usage incl. options', function () {
			var passwordless = new Passwordless();
			passwordless.init(new TokenStoreMock());
			passwordless.addDelivery('email', deliveryMockSend, { ttl: 1000 });
		});

		it('shall throw an Error if first an unnamed and then a named method is added', function () {
			var passwordless = new Passwordless();
			passwordless.init(new TokenStoreMock());
			passwordless.addDelivery(deliveryMockSend);
			expect(function() {
				passwordless.addDelivery('email', deliveryMockSend)
			}).to.throw(Error);
		});

		it('shall throw an Error if first a named and then an unamed method is added', function () {
			var passwordless = new Passwordless();
			passwordless.init(new TokenStoreMock());
			passwordless.addDelivery('email', deliveryMockSend);
			expect(function() {
				passwordless.addDelivery(deliveryMockSend)
			}).to.throw(Error);
		});

		it('shall work for two or more named delivery methods', function () {
			var passwordless = new Passwordless();
			passwordless.init(new TokenStoreMock());
			passwordless.addDelivery('email', deliveryMockSend);
			passwordless.addDelivery('sms', deliveryMockSend);
			passwordless.addDelivery('phone', deliveryMockSend);
		});

		it('shall throw an Error if two times the same named method is added', function () {
			var passwordless = new Passwordless();
			passwordless.init(new TokenStoreMock());
			passwordless.addDelivery('email', deliveryMockSend);
			expect(function() {
				passwordless.addDelivery('email', deliveryMockSend)
			}).to.throw(Error);
		});
	});
});