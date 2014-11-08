'use strict';

var expect = require('chai').expect;
var express = require('express');
var request = require('supertest');
var cookieParser = require('cookie-parser');
var expressSession = require('express-session');
var Passwordless = require('../../').Passwordless;
var TokenStoreMock = require('../mock/tokenstoremock');
var Mocks = require('../mock/mocks');

describe('passwordless', function() {
	describe('addDelivery', function() {

		var mocks = new Mocks();

		it('shall work with correct default usage', function () {
			var passwordless = new Passwordless();
			passwordless.init(new TokenStoreMock());
			passwordless.addDelivery(mocks.deliveryMockSend());
		});

		it('shall work with correct default usage incl. options', function () {
			var passwordless = new Passwordless();
			passwordless.init(new TokenStoreMock());
			passwordless.addDelivery(mocks.deliveryMockSend(), {ttl: 1000});
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
				passwordless.addDelivery('email', mocks.deliveryMockSend(), {ttl: '10'})
			}).to.throw(Error);
		});

		it('shall throw an Error if options:tokenAlgorithm is of wrong format', function () {
			var passwordless = new Passwordless();
			passwordless.init(new TokenStoreMock());
			expect(function() {
				passwordless.addDelivery('email', mocks.deliveryMockSend(), {tokenAlgorithm: '10'})
			}).to.throw(Error);
		});

		it('shall throw an Error if options:numberToken is of wrong format', function () {
			var passwordless = new Passwordless();
			passwordless.init(new TokenStoreMock());
			expect(function() {
				passwordless.addDelivery('email', mocks.deliveryMockSend(), {numberToken: '10'})
			}).to.throw(Error);
		});

		it('shall throw an Error if options:tokenAlgorithm is used together with option:numberToken', function () {
			var passwordless = new Passwordless();
			passwordless.init(new TokenStoreMock());
			expect(function() {
				passwordless.addDelivery('email', mocks.deliveryMockSend(), {
					tokenAlgorithm: function() { return "random"},
					numberToken: {
						max: 9999
					}
				})
			}).to.throw(Error);
		});

		it('shall throw an Error if a second default delivery method is added', function () {
			var passwordless = new Passwordless();
			passwordless.init(new TokenStoreMock());
			passwordless.addDelivery(mocks.deliveryMockSend());
			expect(function() {
				passwordless.addDelivery(mocks.deliveryMockSend())
			}).to.throw(Error);
		});

		it('shall work with correct named delivery method usage', function () {
			var passwordless = new Passwordless();
			passwordless.init(new TokenStoreMock());
			passwordless.addDelivery('email', mocks.deliveryMockSend());
		});

		it('shall work with correct named delivery method usage incl. options', function () {
			var passwordless = new Passwordless();
			passwordless.init(new TokenStoreMock());
			passwordless.addDelivery('email', mocks.deliveryMockSend(), { ttl: 1000 });
		});

		it('shall throw an Error if first an unnamed and then a named method is added', function () {
			var passwordless = new Passwordless();
			passwordless.init(new TokenStoreMock());
			passwordless.addDelivery(mocks.deliveryMockSend());
			expect(function() {
				passwordless.addDelivery('email', mocks.deliveryMockSend())
			}).to.throw(Error);
		});

		it('shall throw an Error if first a named and then an unamed method is added', function () {
			var passwordless = new Passwordless();
			passwordless.init(new TokenStoreMock());
			passwordless.addDelivery('email', mocks.deliveryMockSend());
			expect(function() {
				passwordless.addDelivery(mocks.deliveryMockSend())
			}).to.throw(Error);
		});

		it('shall work for two or more named delivery methods', function () {
			var passwordless = new Passwordless();
			passwordless.init(new TokenStoreMock());
			passwordless.addDelivery('email', mocks.deliveryMockSend());
			passwordless.addDelivery('sms', mocks.deliveryMockSend());
			passwordless.addDelivery('phone', mocks.deliveryMockSend());
		});

		it('shall throw an Error if two times the same named method is added', function () {
			var passwordless = new Passwordless();
			passwordless.init(new TokenStoreMock());
			passwordless.addDelivery('email', mocks.deliveryMockSend());
			expect(function() {
				passwordless.addDelivery('email', mocks.deliveryMockSend())
			}).to.throw(Error);
		});
	});
});