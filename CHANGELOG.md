# 1.1.2 (2016-10-22)

Bugfixes:
- FIX _generateNumberToken converts the generated number into a string

# 1.1.1 (2016-03-05)

Bugfixes:
- N/A

Features:
- ADD pass of req object to the addDelivery callback

Documentation:
- ADD pass of req object to the addDelivery callback

# 1.1.0 (2015-06-18)

Bugfixes:
- N/A

Features:
- ADD option.skipForceSessionSave to support cookie-session middleware
- UPDATE to latest dependencies
- UPDATE example to work with latest dependencies

Documentation:
- N/A

# 1.0.9 (2015-02-14)

Bugfixes:
- N/A

Features:
- N/A

Documentation:
- Better documentation of all callbacks used in Passwordless
- Clarification of Readme.md highlighting that req is passed to the callback

# 1.0.8 (2014-11-26)

Bugfixes:
- N/A

Features:
- UPDATE res.send(status) to res.status.send() in line with Express API changes. Backwards compatible to Express 3.x

Documentation:
- N/A

# 1.0.7 (2014-11-23)

Bugfixes:
- FIXED handling of UIDs as numbers can cause issues with MongoDB

Features:
- N/A

Documentation:
- N/A

# 1.0.6 (2014-11-23)

Bugfixes:
- FIXED handling of allowGet for requestToken does not get tripped by request body data

Features:
- N/A

Documentation:
- N/A

# 1.0.5 (2014-11-07)

Bugfixes:
- N/A

Features:
- ADD addDelivery options.numberToken to generate number-based tokens

Documentation:
- Small update to include numberToken

# 1.0.4 (2014-10-29)

Bugfixes:
- FIXED wrong capitalization of lib/passwordless folder

Features:
- UPDATE dependency of Base58 encoder to bs58 (pure JS)

Documentation:
- N/A

# 1.0.3 (2014-10-25)

Bugfixes:
- N/A

Features:
- UPDATE token generator to ensure use of Node.js' strong crypro lib
- UPDATE token generator to produce shorter Base58 tokens
- ADD dependency to base58-native
- REMOVE dependency to node-uuid

Documentation:
- N/A

# 1.0.2 (2014-10-25)

Bugfixes:
- ADD save-session before redirect to avoid a bug in express

Features:
- N/A

Documentation:
- N/A

# 1.0.1 (2014-10-18)

Bugfixes:
- N/A

Features:
- UPDATED error description involving req.body to be clearer

Documentation:
- N/A

# 1.0.0 (2014-10-15)

Bugfixes:
- N/A

Features:
- BUMP to v1.0.0 - Passwordless can be considered stable now

Documentation:
- N/A

# 0.1.6 (2014-10-15)

Bugfixes:
- N/A

Features:
- update to have the example pull passwordless from npm

Documentation:
- N/A

# 0.1.5 (2014-10-10)

Bugfixes:
- N/A

Features:
- update to pass request object to getUserId of requestToken

Documentation:
- update to incude changes to requestToken

# 0.1.4 (2014-07-06)

Bugfixes:
- N/A

Features:
- add breaking change: by default allowTokenReuse is set to false
- add option: allowTokenReuse to define wether users are allow to re-use tokens

Documentation:
- update to include allowTokenReuse option

# 0.1.3 (2014-07-05)

Bugfixes:
- N/A

Features:
- add successRedirect option for acceptToken

Documentation:
- update to include successRedirect option
- update of smaller typos

# 0.1.2 (2014-06-26)

Bugfixes:
- N/A

Features:
- N/A

Documentation:
- add CHANGELOG
- update of README