## Deep dive
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
	passwordless.requestToken(function(user, delivery, callback, req) {
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
	passwordless.requestToken(function(user, delivery, callback, req) {
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
For some token-delivery channels you want to have the shortest possible token (e.g. for text messages). One way to do so is to remove the user ID from the token URL and to only keep the token for itself. The user ID is then kept in the session. In practice this could look like this: A user types in his phone number, hits submit, is redirected to another page where she has to type in the token received per SMS, and then hit submit another time. 

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
		function(user, delivery, callback, req) {
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
You can generate your own tokens. This is not recommended except you face delivery constraints such as SMS-based authentication. If you reduce the complexity of your tokens, please consider reducing as well the lifetime of the tokens (see above):
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
