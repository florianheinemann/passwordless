# Passwordless

Passwordless is a node.js module for [express](http://expressjs.com/) that allows *authentication* and *authorization* without passwords but simply by sending tokens via email or other means. It utilizes a very similar mechanism as many sites use for resetting passwords. The module was inspired by Justin Balthrop's aritcle "[Passwords are Obsolete](https://medium.com/@ninjudd/passwords-are-obsolete-9ed56d483eb)"

Check out a **demo** and further documentation on http://www.passwordless.net

The module is particularly useful if:
* you would like to avoid the implicit risks of passwords (such as users reusing them across sites), or
* your site is only visited infrequently or has long-lasting sessions, or
* you don't want to burden your users with passwords, or
* you want to have your users started by just entering their email, or
* you have just a handful of fixed users and want to avoid the trouble of a full user auth system

## Getting you started

### 1. Install the module:

`$ npm install passwordless --save`

Usually you also want to install a TokenStore such as [MongoStore](https://github.com/florianheinemann/passwordless-mongostore) and something to deliver the tokens.

`$ npm install passwordless-mongostore --save`

`$ npm install emailjs --save`

### 2. Require the needed modules
You will need:
* Passwordless
* A TokenStore to store the tokens such as [MongoStore](https://github.com/florianheinemann/passwordless-mongostore)
* Something to deliver the tokens such as [emailjs](https://github.com/eleith/emailjs) for email or [twilio](https://www.twilio.com/docs/node/install) for text messages / SMS

```javascript
var passwordless = require('passwordless');
var MongoStore = require('passwordless-mongostore');
var email   = require("emailjs");
```

### 3. Setup your delivery
Depending on how you want to deliver your tokens, this could look like this for emailjs:

```javascript
var smtpServer  = email.server.connect({
   user:    yourEmail, 
   password: yourPwd, 
   host:    yourSmtp, 
   ssl:     true
});
```

### 4. Initialize Passwordless
Simple:
```javascript
// Your MongoDB TokenStore
var pathToMongoDb = 'mongodb://localhost/passwordless-simple-mail';
passwordless.init(new MongoStore(pathToMongoDb));
```

### 5. Tell Passwordless how to deliver a token
`passwordless.addDelivery(deliver)` adds a new delivery mechanism. `deliver` is called whenever a token has to be sent. By default, you should provide the user with a link in the following format:

`http://www.example.com/token=TOKEN&uid=UID`

That's how you could do this with emailjs:

```javascript
// Set up a delivery service
passwordless.addDelivery(
  function(tokenToSend, uidToSend, recipient, callback) {
    var host = 'localhost:3000'
    smtpServer.send({
     text:    'Hello!\nAccess your account here: http://' 
          + host + '?token=' + tokenToSend + '&uid=' + encodeURIComponent(uidToSend), 
     from:    yourEmail, 
     to:      recipient,
     subject: 'Token for ' + host
   }, function(err, message) { 
        if(err) {
            console.log(err);
        }
        callback(err);
    });
});
```

### 6. Setup the middleware for express
```javascript
app.use(passwordless.sessionSupport());
app.use(passwordless.acceptToken());
```

`sessionSupport()` makes the user login persistent, so the user will stay logged in. It has to come after your session middleware. Have a look at [express-session](https://github.com/expressjs/session) how to setup sessions if you are unsure.

`acceptToken()` will accept any incoming requests for tokens (see the URL in step 5). If you like, you could also restrict that to certain URLs.

## Options

To be finalized

## Tests

`$ npm test`

## License

[MIT License](http://opensource.org/licenses/MIT)

## Author
Florian Heinemann [@thesumofall](http://twitter.com/thesumofall/)
