
/**
 * Module dependencies.
 */

var express = require('express');
var http = require('http');
var path = require('path');

var bodyParser = require('body-parser')
var cookieParser = require('cookie-parser');
var expressSession = require('express-session');

var Passwordless = require('passwordless');
var MongoStore = require('passwordless-mongostore');
var email   = require("emailjs");

var yourEmail = 'YOUR MAIL';
var yourPwd = 'YOUR PWD FOR YOUR MAIL';
var yourSmtp = 'SMTP FOR YOUR MAIL, e.g.: smtp.gmail.com';
var host = 'http://localhost:3000/';

var server  = email.server.connect({
   user:    yourEmail, 
   password: yourPwd, 
   host:    yourSmtp, 
   ssl:     true
});

var app = express();

var passwordless = new Passwordless(new MongoStore('mongodb://localhost/passwordless-mongostore-simple-mail'));
passwordless.add(function(contactToVerify, callback) {
		callback(null, contactToVerify);
	}, function(tokenToSend, user, callback) {
		server.send({
		   text:    'Hello!\nYou can now access your account here: ' + host + '?token=' + tokenToSend, 
		   from:    yourEmail, 
		   to:      user,
		   subject: 'Token for ' + host
		}, function(err, message) { 
			if(err) {
				console.log(err);
			}
			callback(err);
		});
	});

app.use(bodyParser());
app.use(cookieParser());
app.use(expressSession({ secret: '42' }));

app.use(passwordless.sessionSupport());
app.use(passwordless.acceptToken());

// Default implementation of express
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', function(req, res) { res.render('index', { user: req.user }) });
app.get('/login', function(req, res) { res.render('login', { user: req.user }) });
app.get('/logout', passwordless.logout(),
	function(req, res) { res.redirect('/') });

app.post('/sendtoken', passwordless.requestToken(),
	function(req, res) { res.render('sent') });

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
