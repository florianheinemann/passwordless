'use strict';

var expect = require('chai').expect;
var TokenStoreMock = require('./tokenstoremock.js');

var standardTests = require('passwordless-tokenstore-test');

function TokenStoreMockFactory(options) {
	return new TokenStoreMock(options);
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

					store.authenticate('valid', 'valid', function(err, valid, ref) {
						expect(err).to.not.exist;
						expect(valid).to.equal(true);
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

					store.authenticate('alice', 'alice', function(err, valid, ref) {
						expect(err).to.not.exist;
						expect(valid).to.equal(true);
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

					store.authenticate('marc', 'marc', function(err, valid, ref) {
						expect(err).to.not.exist;
						expect(valid).to.equal(true);
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

					store.authenticate('invalid', 'invalid', function(err, valid, ref) {
						expect(err).to.not.exist;
						expect(valid).to.equal(false);
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

					store.authenticate('error', 'error', function(err, valid, ref) {
						expect(err).to.exist;
						expect(valid).to.equal(false);
						expect(ref).to.not.exist;
						done();
					})
				})
			})

			it('should disable all unit test shortcuts when initiated with {integration: true}', function(done) {
				var store = TokenStoreMockFactory({integration:true});

				store.authenticate('error', 'error', function(err, valid, ref) {
					expect(err).to.not.exist;
					expect(valid).to.equal(false);
					expect(ref).to.not.exist;
					store.authenticate('valid', 'valid', function(err, valid, ref) {
						expect(err).to.not.exist;
						expect(valid).to.equal(false);
						expect(ref).to.not.exist;
						store.authenticate('invalid', 'invalid', function(err, valid, ref) {
							expect(err).to.not.exist;
							expect(valid).to.equal(false);
							expect(ref).to.not.exist;
							done();
						})
					})
				})
			})
		})
	})
});