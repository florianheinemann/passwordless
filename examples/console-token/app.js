/*
A simple example of Passwordless that requires no configuration and no database.
Hence, this is perfect to give Passwordless a quick spin.
Just run 'npm install' and then 'npm start' within this directory
*/

// Imports relevant packages
const express = require('express');
const app = express();
const session = require('express-session')
const passwordless = require('passwordless');
const MemoryStore = require('passwordless-memorystore');
const bodyParser = require('body-parser');

// Our user database. Typically, you'd store those in a database 
const users = [
    { id: 1, email: 'marc@example.com' },
    { id: 2, email: 'alice@example.com' }
];

// Prepare express (add support for sessions and for receiving POST requests)
app.use(session({secret: 'foo', resave: false, saveUninitialized: true }))
app.use(bodyParser.urlencoded({ extended: false }));

// Prepare Passwordless and tell it that we want to store the temporary tokens in memory
passwordless.init(new MemoryStore());

// Tell Passwordless what to do when a user requests a token
// Here, we simply show a link with the token in the sever console
// In practice, we'd send an email or text message to the user
passwordless.addDelivery(
    function(tokenToSend, uidToSend, recipient, callback) {
        console.log('Access the account here:\n'
            + 'http://localhost:3000/' 
            + '?token=' + tokenToSend + '&uid=' 
            + encodeURIComponent(uidToSend));
        callback();
});

// Prepare Passwordless' session support and tell it
// to accept tokens on any URL
app.use(passwordless.sessionSupport());
app.use(passwordless.acceptToken({ successRedirect: '/'}));

// Display a login form
app.get('/', function(req, res) {
    var userString = '';
    if(req.user) {
        userString = '<p>Hi, ' + findUserById(req.user).email + '</p>';
    }

    res.send('<html>                                            \
                <body>                                          \
                    <h1>Passwordless Demo</h1>' 
                +   userString
                +   '<h2>Login</h2>                             \
                    <form action="/sendtoken" method="POST">    \
                        Email:                                  \
                        <br><input name="user" type="text">     \
                        <br><input type="submit" value="Login"> \
                    </form>                                     \
                </body>                                         \
            </html>');
});

// Accept the login form via POST
app.post('/sendtoken', 
    passwordless.requestToken(
        function(user, delivery, callback) {
            var currentUser = findUserByEmail(user);
            callback(null, (currentUser) ? currentUser.id : null);
        }
    ),
    function(req, res) {
        res.send('Sent - The token link has been sent to your server \
                    console. In practice, you would send it via email or text message!');
    }
);

// Launch express
app.listen(3000, () => console.log('Example app listening on port 3000!'));

// Find a user via its email address 
function findUserByEmail(email) {
    for (var i = users.length - 1; i >= 0; i--) {
        if(users[i].email === email.toLowerCase()) {
            return users[i];
        }
    }
    return null;
}

// Find a user by its ID
function findUserById(id) {
    for (var i = users.length - 1; i >= 0; i--) {
        if(users[i].id === parseInt(id, 10)) {
            return users[i];
        }
    }
    return null;
}