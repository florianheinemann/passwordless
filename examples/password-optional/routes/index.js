var express = require('express');
var router = express.Router();
var User = require('../models/user');

// TODO: In production please require the proper module
// var passwordless = require('passwordless');
var passwordless = require('../../../');


/* GET home page. */
router.get('/', function(req, res) {
  res.render('index', { user: req.user });
});

/* GET restricted site. */
router.get('/restricted', passwordless.restricted(),
 function(req, res) {
  res.render('restricted', { user: req.user });
});

/* GET logout. */
router.get('/logout', passwordless.logout(),
	function(req, res) {
  res.redirect('/');
});

/* GET login screen (see POST below) */
router.get('/login', function(req, res) {
  res.render('login', { user: req.user });
});

/* POST login. */
router.post('/login',
	function(req, res, next) {
		// Password provided
		if(req.body.password.length >= 0) {
			// Does the user already exist?
			User.hasUser(req.body.user, function(error, user) {
				if(user) {
					// Yes, check password
					User.verifyUser(req.body.user, req.body.password, function(error, user) {
						// Password valid?
						if(user) {
							// Yes, store user in request and session
							req.user = req.session.passwordless = user.email;
							// Redirect to homepage
							res.redirect(301, '/');
						} else { // Password not valid
							res.send(401, 'Password not valid');
						}
					})
				} else { // user doesn't exist
					User.createUser(req.body.user, req.body.password, function(error, user) {
						if(error)
							throw new Error(error);
						// Stpre user in request and session
						req.user = req.session.passwordless = user.email;
						// Redirect to homepage
						res.redirect(301, '/');
					});
				}
			})
		} else {
			passwordless.requestToken(
				function(user, delivery, callback) {
					// Check that user is valid or create one
					User.hasUser(req.body.user, function(error, user) {
						if(user) {
							// User exist - return her to Passwordless to send the token
							callback(null, user.email);
						} else {
							// User doesn't exist - create the user and give her to Passwordless
							User.createUser(req.body.user, null, function(error, user) {
								callback(error, (user) ? user.email : null);
							})
						}
					})
				})
		}

	},
	function(req, res) {
		// Token was successfully delivered, else 
		// requestToken would have return an error page
		// This will also only be called if no redirect has happend above
  		res.render('sent');
});

module.exports = router;