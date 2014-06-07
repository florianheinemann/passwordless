'use strict';

var expect = require('chai').expect;
var TokenStoreMock = require('./tokenstoremock.js');

var standardTests = require('passwordless-tokenstore-test');

function TokenStoreMockFactory() {
	return new TokenStoreMock();
}

var beforeEachTest = function(done) {
	done();
}

var afterEachTest = function(done) {
	done();
}

describe('Passwordless', function() {
	describe('TokenStoreMock', function() {

		// Call all standard tests
		standardTests(TokenStoreMockFactory, beforeEachTest, afterEachTest);

		describe('Specific tests', function() {
			it('should authenticate requests for the token "valid" for limited testing', function(done) {
				var store = TokenStoreMockFactory();
				store.length(function(err, count) {
					expect(count).to.equal(0);
					expect(err).to.not.exist;

					store.authenticate('valid', function(err, uid, ref) {
						expect(err).to.not.exist;
						expect(uid).to.exist;
						expect(ref).to.exist;
						done();
					})
				})
			})

			it('should authenticate requests for the token "alice" for limited testing', function(done) {
				var store = TokenStoreMockFactory();
				store.length(function(err, count) {
					expect(count).to.equal(0);
					expect(err).to.not.exist;

					store.authenticate('alice', function(err, uid, ref) {
						expect(err).to.not.exist;
						expect(uid).to.equal('alice@example.com');
						expect(ref).to.equal('http://example.com/alice');
						done();
					})
				})
			})

			it('should authenticate requests for the token "marc" for limited testing', function(done) {
				var store = TokenStoreMockFactory();
				store.length(function(err, count) {
					expect(count).to.equal(0);
					expect(err).to.not.exist;

					store.authenticate('marc', function(err, uid, ref) {
						expect(err).to.not.exist;
						expect(uid).to.equal('marc@example.com');
						expect(ref).to.equal('http://example.com/marc');
						done();
					})
				})
			})

			it('should not authenticate requests for the token "invalid" for limited testing', function(done) {
				var store = TokenStoreMockFactory();
				store.length(function(err, count) {
					expect(count).to.equal(0);
					expect(err).to.not.exist;

					store.authenticate('invalid', function(err, uid, ref) {
						expect(err).to.not.exist;
						expect(uid).to.not.exist;
						expect(ref).to.not.exist;
						done();
					})
				})
			})

			it('should raise an error for the token "error" for limited testing', function(done) {
				var store = TokenStoreMockFactory();
				store.length(function(err, count) {
					expect(count).to.equal(0);
					expect(err).to.not.exist;

					store.authenticate('error', function(err, uid, ref) {
						expect(err).to.exist;
						expect(uid).to.not.exist;
						expect(ref).to.not.exist;
						done();
					})
				})
			})
		})
	})
});