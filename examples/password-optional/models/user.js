'use strict';

var util = require('util');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var crypto = require('crypto');
var config = require('./config');

var userSchema = new Schema({
	email: 		{ type: String, required: true },
	hash: 			{ type: String, required: false },
	salt: 			{ type: String, required: false },
});

userSchema.methods.verifyPassword = function(password, callback) {
	if(!password)
		return callback(null, false);

	var originalHash = this.hash;
	User.hashPassword(password, this.salt, function(error, hash, salt) {
		if(error)
			return callback(error);
		callback(null, hash === originalHash);
	});
};

userSchema.statics.verifyUser = function(email, password, callback) {
	if(!email || !password)
		return callback('No email or password provided')

	this.findOne({ email: new RegExp('^'+email+'$', "i") }, function(error, user) {
		if(error) {
			callback(error);
		} else if(user) {
			user.verifyPassword(password, function(error, validated) {
				callback(error, (validated) ? user : false);
			});
		} else {
			callback(null, false);
		}
	})
};

userSchema.statics.hashPassword = function(plainPassword, salt, callback) {
	// Make salt optional
	if(callback === undefined && salt instanceof Function) {
		callback = salt;
		salt = undefined;
	}

	if(typeof salt === 'string') {
		salt = new Buffer(salt, 'hex');
	}

	var calcHash = function() {
		crypto.pbkdf2(plainPassword, salt, 10000, 64, function(err, key) {
			if(err)
				return callback(err);
			callback(null, key.toString('hex'), salt.toString('hex'));
		})		
	};

	if(!salt) {
		crypto.randomBytes(64, function(err, gensalt) {
			if(err)
				return callback(err);
			salt = gensalt;
			calcHash();
		});		
	} else {
		calcHash();
	}
};

userSchema.statics.hasUser = function(email, callback) {
	if(!email)
		return callback('No email provided')
	this.findOne({ email: new RegExp('^'+email+'$', "i") }, callback});
};

userSchema.statics.createUser = function(email, password, callback) {
	// Password is optional
	if(!email)
		return callback('No email provided')

	this.findOne({ email: new RegExp('^'+email+'$', "i") }, function(error, user) {
		if(error) {
			callback(error);
		} else if(!user) {
			var newUser = new User({
				email: email
			});
			// Password provided
			if(password) {
				User.hashPassword(password, function(error, hash, salt) {
					if(error)
						return callback(error);
					newUser.hash = hash;
					newUser.salt = salt;
					newUser.save(callback);
				});
			} else { // No password provided
				newUser.save(callback);
			}
		} else {
			callback('This user already exists');
		}
	})
};
	
var db = mongoose.connect(config.mongodb.uri, { server: { auto_reconnect: true } });
var User = db.model('Users', userSchema);

module.exports = User;