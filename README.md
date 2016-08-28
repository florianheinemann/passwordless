# Passwordless

Passwordless is a modern node.js module for [Express](http://expressjs.com/) that allows *authentication* and *authorization* without passwords by simply sending one-time password (OTPW) tokens via email or other means. It utilizes a very similar mechanism as the reset password feature of classic websites. The module was inspired by Justin Balthrop's article "[Passwords are Obsolete](https://medium.com/@ninjudd/passwords-are-obsolete-9ed56d483eb)"

Check out a [**demo**](https://passwordless.net) and further documentation on https://passwordless.net or have a look at an [**example**](https://github.com/florianheinemann/passwordless/tree/master/examples/simple-mail).

Token-based authentication is...
* **Faster to implement** compared to typical user auth systems (you only need one form)
* **Better for your users** as they get started with your app quickly and don't have to remember passwords
* **More secure** for your users avoiding the risks of reused passwords

## Getting you started

The following should provide a quick-start in using Passwordless. If you need more details check out the [example](https://github.com/florianheinemann/passwordless/tree/master/examples/simple-mail), the [deep dive](https://passwordless.net/deepdive), or the [documentation](https://passwordless.net/docs/Passwordless.html). Also, don't hesitate to raise comments and questions on [GitHub](https://github.com/florianheinemann/passwordless/issues).

### 1. Install the module:

`$ npm install passwordless --save`

You'll also want to install a [TokenStore](https://passwordless.net/plugins) such as [MongoStore](https://github.com/florianheinemann/passwordless-mongostore) and something to deliver the tokens (be it email, SMS or any other means). For example:

`$ npm install passwordless-mongostore --save`

`$ npm install emailjs --save`

If you need to store your tokens differently consider [developing a new TokenStore](https://github.com/florianheinemann/passwordless-tokenstore-test) and [let us know](https://twitter.com/thesumofall).

### 2. Require the needed modules
You will need:
* Passwordless
* A TokenStore to store the tokens such as [MongoStore](https://github.com/florianheinemann/passwordless-mongostore)
* Something to deliver the tokens such as [emailjs](https://github.com/eleith/emailjs) for email or [twilio](https://www.twilio.com/docs/node/install) for text messages / SMS

```javascript
var passwordless = require('passwordless');
var MongoStore = require('passwordless-mongostore');
var email   = require('emailjs');
```

### 3. Setup your delivery
This is very much depending on how you want to deliver your tokens, but if you use emailjs this could look like this:
```javascript
var smtpServer  = email.server.connect({
   user:    yourEmail, 
   password: yourPwd, 
   host:    yourSmtp, 
   ssl:     true
});
```

### 4. Initialize Passwordless
`passwordless.init()` will take your TokenStore, which will store the generated tokens as shown below for a MongoStore:
```javascript
// Your MongoDB TokenStore
var pathToMongoDb = 'mongodb://localhost/passwordless-simple-mail';
passwordless.init(new MongoStore(pathToMongoDb));
```

### 5. Tell Passwordless how to deliver a token
`passwordless.addDelivery(deliver)` adds a new delivery mechanism. `deliver` is called whenever a token has to be sent. By default, the mechanism you choose should provide the user with a link in the following format:

`http://www.example.com/?token={TOKEN}&uid={UID}`

That's how you could do this with emailjs:
```javascript
// Set up a delivery service
passwordless.addDelivery(
	function(tokenToSend, uidToSend, recipient, callback, req) {
		var host = 'localhost:3000';
		smtpServer.send({
			text:    'Hello!\nAccess your account here: http://' 
			+ host + '?token=' + tokenToSend + '&uid=' 
			+ encodeURIComponent(uidToSend), 
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
app.use(passwordless.acceptToken({ successRedirect: '/'}));
```

`sessionSupport()` makes the login persistent, so the user will stay logged in while browsing your site. Make sure to have added your session middleware *before* this line. Have a look at [express-session](https://github.com/expressjs/session) how to setup sessions if you are unsure. Please be aware: If you decide to use [cookie-session](https://github.com/expressjs/cookie-session) rather than e.g. express-session as your middleware you have to set `passwordless.init(tokenStore, {skipForceSessionSave:true})`

`acceptToken()` will accept incoming tokens and authenticate the user (see the URL in step 5). While the option `successRedirect` is not strictly needed, it is strongly recommended to use it to avoid leaking valid tokens via the referrer header of outgoing HTTP links. When provided, the user will be forwarded to the given URL as soon as she has been authenticated.

Instead of accepting tokens on any URL as done above you can also restrict the acceptance of tokens to certain URLs:
```javascript
// Accept tokens only on /logged_in (be sure to change the
// URL you deliver in step 5)
router.get('/logged_in', passwordless.acceptToken(), 
	function(req, res) {
		res.render('homepage');
});
```

### 7. The router
The following takes for granted that you've already setup your router `var router = express.Router();` as explained in the [express docs](http://expressjs.com/4x/api.html#router)

You will need at least URLs to:
* Display a page asking for the user's email (or phone number, ...)
* Receive these details (via POST) and identify the user

For example like this:
```javascript
/* GET login screen. */
router.get('/login', function(req, res) {
   res.render('login');
});

/* POST login details. */
router.post('/sendtoken', 
	passwordless.requestToken(
		// Turn the email address into an user's ID
		function(user, delivery, callback, req) {
			// usually you would want something like:
			User.find({email: user}, callback(ret) {
			   if(ret)
			      callback(null, ret.id)
			   else
			      callback(null, null)
	      })
	      // but you could also do the following 
	      // if you want to allow anyone:
	      // callback(null, user);
		}),
	function(req, res) {
	   // success!
  		res.render('sent');
});
```

What happens here? `passwordless.requestToken(getUserId)` has two tasks: Making sure the email address exists *and* transforming it into a proper user ID that will become the identifier from now on. For example user@example.com becomes 123 or 'u1002'. You call `callback(null, ID)` if all is good, `callback(null, null)` if you don't know this email address, and `callback('error', null)` if something went wrong. At this stage, please make sure that you've added middleware to parse POST data (such as [body-parser](https://github.com/expressjs/body-parser)).

Most likely, you want a user registration page where you take an email address and any other user details and generate an ID. However, you can also simply accept any email address by skipping the lookup and just calling `callback(null, user)`.

In an even simpler scenario and if you just have a fixed list of users do the following:
```javascript
// GET login as above

var users = [
	{ id: 1, email: 'marc@example.com' },
	{ id: 2, email: 'alice@example.com' }
];

/* POST login details. */
router.post('/sendtoken', 
	passwordless.requestToken(
		function(user, delivery, callback) {
			for (var i = users.length - 1; i >= 0; i--) {
				if(users[i].email === user.toLowerCase()) {
					return callback(null, users[i].id);
				}
			}
			callback(null, null);
		}),
		function(req, res) {
			// success!
		res.render('sent');
});
```

### 8. Login page
All you need is a form where users enter their email address, for example:
```html
<html>
	<body>
		<h1>Login</h1>
		<form action="/sendtoken" method="POST">
			Email:
			<br><input name="user" type="text">
			<br><input type="submit" value="Login">
		</form>
	</body>
</html>
```
By default, Passwordless will look for a field called `user` submitted via POST.

### 9. Protect your pages
You can protect all pages that should only be accessed by authenticated users by using the `passwordless.restricted()` middleware, for example:
```javascript
/* GET restricted site. */
router.get('/restricted', passwordless.restricted(),
 function(req, res) {
  // render the secret page
});
```
You can also protect a full path, by adding:
```javascript
router.use('/admin', passwordless.restricted());
```

### 10. Who is logged in?
Passwordless stores the user ID in req.user (this can be changed via configuration). So, if you want to display the user's details or use them for further requests, do something like:
```javascript
router.get('/admin', passwordless.restricted(),
	function(req, res) {
		res.render('admin', { user: req.user });
});
```
You could also create a middleware that is adding the user to any request and enriching it with all user details. Make sure, though, that you are adding this middleware after `acceptToken()` and `sessionSupport()`:
```javascript
app.use(function(req, res, next) {
	if(req.user) {
		User.findById(req.user, function(error, user) {
			res.locals.user = user;
			next();
		});
	} else { 
		next();
	}
})
```

## Common options
### Logout
Just call `passwordless.logout()` as in:
```javascript
router.get('/logout', passwordless.logout(),
	function(req, res) {
		res.redirect('/');
});
```

### Redirects
Redirect non-authorised users who try to access protected resources with `failureRedirect` (default is a 401 error page):
```javascript
router.get('/restricted', 
	passwordless.restricted({ failureRedirect: '/login' });
```

Redirect unsuccessful login attempts with `failureRedirect` (default is a 401 or 400 error page):
```javascript
router.post('/login', 
	passwordless.requestToken(function(user, delivery, callback) {
		// identify user
}, { failureRedirect: '/login' }),
	function(req, res){
		// success
});
```

After the successful authentication through `acceptToken()`, you can redirect the user to a specific URL with `successRedirect`:
```javascript
app.use(passwordless.acceptToken(
	{ successRedirect: '/' }));
```
While the option `successRedirect` is not strictly needed, it is strongly recommended to use it to avoid leaking valid tokens via the referrer header of outgoing HTTP links on your site. When provided, the user will be forwarded to the given URL as soon as she has been authenticated. If not provided, Passwordless will simply call the next middleware.

### Error flashes
Error flashes are session-based error messages that are pushed to the user with the next request. For example, you might want to show a certain message when the user authentication was not successful or when a user was redirected after accessing a resource she should not have access to. To make this work, you need to have sessions enabled and a flash middleware such as [connect-flash](https://www.npmjs.org/package/connect-flash) installed.

Error flashes are supported in any middleware of Passwordless that supports `failureRedirect` (see above) but only(!) if `failureRedirect` is also supplied: 
- `restricted()` when the user is not authorized to access the resource
- `requestToken()` when the supplied user details are unknown

As an example:
```javascript
router.post('/login', 
	passwordless.requestToken(function(user, delivery, callback) {
		// identify user
}, { failureRedirect: '/login', failureFlash: 'This user is unknown!' }),
	function(req, res){
		// success
});
```

The error flashes are pushed onto the `passwordless` array of your flash middleware. Check out the [connect-flash docs](https://github.com/jaredhanson/connect-flash) how to pull the error messages, but a typical scenario should look like this:

```javascript
router.get('/mistake',
	function(req, res) {
		var errors = req.flash('passwordless'), errHtml;
		for (var i = errors.length - 1; i >= 0; i--) {
			errHtml += '<p>' + errors[i] + '</p>';
		}
		res.send(200, errHtml);
});
```

### Success flashes
Similar to error flashes success flashes are session-based messages that are pushed to the user with the next request. For example, you might want to show a certain message when the user has clicked on the token URL and the token was accepted by the system. To make this work, you need to have sessions enabled and a flash middleware such as [connect-flash](https://www.npmjs.org/package/connect-flash) installed.

Success flashes are supported by the following middleware of Passwordless:
- `acceptToken()` when the token was successfully validated
- `logout()` when the user was logged in and was successfully logged out
- `requestToken()` when the token was successfully stored and send out to the user

Consider the following example:
```javascript
router.get('/logout', passwordless.logout( 
	{successFlash: 'Hope to see you soon!'} ),
	function(req, res) {
  	res.redirect('/home');
});
```

The messages are pushed onto the `passwordless-success` array of your flash middleware. Check out the [connect-flash docs](https://github.com/jaredhanson/connect-flash) how to pull the messages, but a typical scenario should look like this:

```javascript
router.get('/home',
	function(req, res) {
		var successes = req.flash('passwordless-success'), html;
		for (var i = successes.length - 1; i >= 0; i--) {
			html += '<p>' + successes[i] + '</p>';
		}
		res.send(200, html);
});
```

### 2-step authentication (e.g. for SMS)
For some token-delivery channels you want to have the shortest possible token (e.g. for text messages). One way to do so is to remove the user ID from the token URL and to only keep the token for itself. The user ID is then kept in the session. In practice his could look like this: A user types in his phone number, hits submit, is redirected to another page where she has to type in the token received per SMS, and then hit submit another time. 

To achieve this, requestToken stores the requested UID in `req.passwordless.uidToAuth`. Putting it all together, take the following steps:

**1: Read out `req.passwordless.uidToAuth`**

```javascript
// Display a new form after the user has submitted the phone number
router.post('/sendtoken', passwordless.requestToken(function(...) { },
	function(req, res) {
  	res.render('secondstep', { uid: req.passwordless.uidToAuth });
});
```

**2: Display another form to submit the token submitting the UID in a hidden input**

```html
<html>
	<body>
		<h1>Login</h1>
		<p>You should have received a token via SMS. Type it in below:</p>
		<form action="/auth" method="POST">
			Token:
			<br><input name="token" type="text">
			<input type="hidden" name="uid" value="<%= uid %>">
			<br><input type="submit" value="Login">
		</form>
	</body>
</html>
```

**3: Allow POST to accept tokens**

```javascript
router.post('/auth', passwordless.acceptToken({ allowPost: true }),
	function(req, res) {
		// success!
});
```

### Successful login and redirect to origin
Passwordless supports the redirect of users to the login page, remembering the original URL, and then redirecting them again to the originally requested page as soon as the token has been accepted. Due to the many steps involved, several modifications have to be undertaken:

**1: Set `originField` and `failureRedirect` for passwordless.restricted()**

Doing this will call `/login` with `/login?origin=/admin` to allow later reuse
```javascript
router.get('/admin', passwordless.restricted( 
	{ originField: 'origin', failureRedirect: '/login' }));
```

**2: Display `origin` as hidden field on the login page**

Be sure to pass `origin` to the page renderer.
```html
<form action="/sendtoken" method="POST">
	Token:
	<br><input name="token" type="text">
	<input type="hidden" name="origin" value="<%= origin %>">
	<br><input type="submit" value="Login">
</form>
```

**3: Let `requestToken()` accept `origin`**

This will store the original URL next to the token in the TokenStore.
```javascript
app.post('/sendtoken', passwordless.requestToken(function(...) { }, 
	{ originField: 'origin' }),
	function(req, res){
		// successfully sent
});
```

**4: Reconfigure `acceptToken()` middleware**

```javascript
app.use(passwordless.acceptToken( { enableOriginRedirect: true } ));
```

### Several delivery strategies
In case you want to use several ways to send out tokens you have to add several delivery strategies to Passwordless as shown below:
```javascript
passwordless.addDelivery('email', 
	function(tokenToSend, uidToSend, recipient, callback) {
		// send the token to recipient
});
passwordless.addDelivery('sms', 
	function(tokenToSend, uidToSend, recipient, callback) {
		// send the token to recipient
});
```
To simplify your code, provide the field `delivery` to your HTML page which submits the recipient details. Afterwards, `requestToken()` will allow you to distinguish between the different methods:
```javascript
router.post('/sendtoken', 
	passwordless.requestToken(
		function(user, delivery, callback) {
			if(delivery === 'sms')
				// lookup phone number
			else if(delivery === 'email')
				// lookup email
		}),
	function(req, res) {
  		res.render('sent');
});
```

### Modify lifetime of a token
This is particularly useful if you use shorter tokens than the default to keep security on a high level:
```javascript
// Lifetime in ms for the specific delivery strategy
passwordless.addDelivery(
	function(tokenToSend, uidToSend, recipient, callback) {
		// send the token to recipient
}, { ttl: 1000*60*10 });
```

### Allow token reuse
By default, all tokens are invalidated after they have been used by the user. Should a user try to use the same token again and is not yet logged in, she will not be authenticated. In some cases (e.g. stateless operation or increased convenience) you might want to allow the reuse of tokens. Please be aware that this might open up your users to the risk of valid tokens being used by third parties without the user being aware of it.

To enable the reuse of tokens call `init()` with the option `allowTokenReuse: true`, as shown here:
```javascript
passwordless.init(new TokenStore(), 
	{ allowTokenReuse: true });
```

### Different tokens
You can generate your own tokens. This is not recommended except you face delivery constraints such as SMS-based authentication. If you reduce the complexity of the token, please consider reducing as well the lifetime of the token (see above):
```javascript
passwordless.addDelivery(
	function(tokenToSend, uidToSend, recipient, callback) {
		// send the token to recipient
}, {tokenAlgorithm: function() {return 'random'}});
```

### Stateless operation
Just remove the `app.use(passwordless.sessionSupport());` middleware. Every request for a restricted resource has then to be combined with a token and uid. You should consider the following points:
* By default, tokens are invalidated after their first use. For stateless operations you should call `passwordless.init()` with the following option: `passwordless.init(tokenStore, {allowTokenReuse:true})` (for details see above)
* Tokens have a limited lifetime. Consider extending it (for details see above), but be aware about the involved security risks
* Consider switching off redirects such as `successRedirect` on the `acceptToken()` middleware

## The tokens and security
By default, tokens are generated using 16 Bytes of pseudo-random data as produced by the cryptographically strong crypto library of Node.js. This can be considered strong enough to withstand brute force attacks especially when combined with a finite time-to-live (set by default to 1h). In addition, it is absolutely mandatory to store the tokens securely by hashing and salting them (done by default with TokenStores such as [MongoStore](https://github.com/florianheinemann/passwordless-mongostore)). Security can be further enhanced by limiting the number of tries per user ID before locking that user out from the service for a certain amount of time.

## Further documentation
- [Full API documentation](https://passwordless.net/docs/Passwordless.html)
- [Getting started](https://passwordless.net/getstarted)
- [Deep dive](https://passwordless.net/deepdive)

## Tests
Download the whole repository and call:
`$ npm test`

## License

[MIT License](http://opensource.org/licenses/MIT)

## Author
Florian Heinemann [@thesumofall](http://twitter.com/thesumofall/)
