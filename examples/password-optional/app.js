var express = require('express');
var path = require('path');
var favicon = require('static-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var expressSession = require('express-session');
var bodyParser = require('body-parser');
var config = require('./config');
var routes = require('./routes/index');

// TODO: In production please require the proper module
// var passwordless = require('passwordless');
var passwordless = require('../../');

var MongoStore = require('passwordless-mongostore');
var email   = require("emailjs");

var app = express();

var smtpServer  = email.server.connect({
   user:    config.mail.email, 
   password: config.mail.pwd, 
   host:    config.mail.smtp, 
   ssl:     true
});

// Setup of Passwordless
passwordless.init(new MongoStore(config.mongodb.uri));
passwordless.addDelivery(
    function(tokenToSend, uidToSend, recipient, callback) {
        // Send out token
        smtpServer.send({
           text:    'Hello!\nYou can now access your account here: ' 
                + config.http.full_host 
                + '?token=' + tokenToSend 
                + '&uid=' + encodeURIComponent(uidToSend), 
           from:    config.mail.email, 
           to:      recipient,
           subject: 'Token for ' + config.http.full_host
        }, function(err, message) { 
            if(err) {
                console.log(err);
            }
            callback(err);
        });
    });

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Standard express setup
app.use(favicon());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());
app.use(expressSession({secret: '42'}));
app.use(express.static(path.join(__dirname, 'public')));

// Passwordless middleware
app.use(passwordless.sessionSupport());
app.use(passwordless.acceptToken());

// CHECK /routes/index.js to better understand which routes are needed at a minimum
app.use('/', routes);

/// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// development error handler
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: err
    });
});

app.set('port', config.http.port);
var server = app.listen(app.get('port'), function() {
    console.log('Express server listening on port ' + server.address().port);
});
