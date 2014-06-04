var express = require('express');
var passwordless = require('../../../lib');
// var passwordless = require('passwordless');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res) {
  res.render('index', { user: req.user });
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
router.post('/sendtoken', passwordless.requestToken(),
	function(req, res) {
  res.render('sent');
});

module.exports = router;