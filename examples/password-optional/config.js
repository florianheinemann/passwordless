'use strict';

var config = {};
config.mongodb = {};
config.mail = {};
config.http = {};

// TODO: All details okay? Should be ok for a local dev deployment
config.http.port = process.env.PORT || 3000;
config.http.full_host = process.env.HTTP_FULL_HOST || ('http://localhost:' + config.http.port)

// TODO: MongoDB URI. Make sure the DB is started and the URL is correct (default port)
config.mongodb.uri = process.env.MONGODB_URI || 'mongodb://localhost/passwordless-password-optional';

// TODO: email setup (has to be changed)
config.mail.email = process.env.MAIL_EMAIL || 'YOUR EMAIL ADDRESS FROM WHICH TO SEND TOKENS';
config.mail.pwd = process.env.MAIL_PWD || 'YOUR PWD FOR THIS EMAIL';
config.mail.smtp = process.env.MAIL_SMTP || 'YOUR SMTP SUCH AS: smtp.gmail.com';

module.exports = config;