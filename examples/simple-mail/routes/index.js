var express = require('express');
var router = express.Router();

var passwordless = require('passwordless');
// var passwordless = require('../../../');


/* GET home page. */
router.get('/', function(req, res) {
  res.render('index', { user: req.user });
});

/* GET restricted site. */
router.get('/restricted', passwordless.restricted(),
 function(req, res) {
  res.render('restricted', { user: req.user });
});

/* GET login screen. */
router.get('/login', function(req, res) {
  res.render('login', { user: req.user });
});

/* GET logout. */
router.get('/logout', passwordless.logout(),
	function(req, res) {
  res.redirect('/');
});

/* POST login screen. */
router.post('/sendtoken', 
	passwordless.requestToken(
		// Simply accept every user
		function(user, delivery, callback) {
			callback(null, user);
			// usually you would want something like:
			// User.find({email: user}, callback(ret) {
			// 		if(ret)
			// 			callback(null, ret.id)
			// 		else
			// 			callback(null, null)
			// })
		}),
	function(req, res) {
  		res.render('sent');
});

module.exports = router;