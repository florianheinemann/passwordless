'use strict';

var expect = require('chai').expect;
var express = require('express');
var request = require('supertest');
var passwordlessInst = require('../lib');
var Passwordless = require('../lib').Passwordless;
var TokenStoreMockAuthOnly = require('./mock/tokenstoreauthonly');

describe('passwordless', function() {
	describe('singleton', function() {
		it('should provide one and only one instance of Passwordless', function () {
			expect(passwordlessInst).to.equal(require('../lib'));
		})
	})

	describe('constructor', function() {		
		it('should instantiate if initialized correctly', function () {
			var passwordless = new Passwordless();
			expect(passwordless).to.be.instanceof(Passwordless);
		})
	})

	describe('init', function() {
		it('should throw an Error if called without parameter', function () {
			var passwordless = new Passwordless();
			expect(function() { passwordless.init() }).to.throw(Error);
		})
		it('should throw an Error if called with an invalid parameter', function () {
			var passwordless = new Passwordless();
			expect(function() { passwordless.init(new Object()) }).to.throw(Error);
		})
		
		it('should proceed if called correctly', function () {
			var passwordless = new Passwordless();
			passwordless.init(new TokenStoreMockAuthOnly());
		})

		it('should proceed if called correctly and allow for options', function () {
			var passwordless = new Passwordless();
			passwordless.init(new TokenStoreMockAuthOnly(), { userProperty: 'test' });
		})
	})
});