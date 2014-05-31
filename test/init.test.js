'use strict';

var expect = require('chai').expect;
var express = require('express');
var request = require('supertest');
var Passwordless = require('../lib');
var TokenStoreMockAuthOnly = require('./mock/tokenstoreauthonly');

describe('passwordless', function() {
	describe('constructor', function() {
		it('should throw an Error if not initialized correctly', function (done) {
			expect(function() { new Passwordless() }).to.throw(Error);
			done();
		})

		it('should throw an Error if not initialized correctly', function (done) {
			expect(function() { new Passwordless(new Object()) }).to.throw(Error);
			done();
		})
		
		it('should instantiate if initialized correctly', function (done) {
			var passwordless = new Passwordless(new TokenStoreMockAuthOnly());
			expect(passwordless).to.be.instanceof(Passwordless);
			done();
		})

		it('should instantiate if initialized correctly and allow for options', function (done) {
			var passwordless = new Passwordless(new TokenStoreMockAuthOnly(), { userProperty: 'test' });
			expect(passwordless).to.be.instanceof(Passwordless);
			done();
		})
	})
});