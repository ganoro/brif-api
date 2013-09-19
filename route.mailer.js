var nodemailer = require("nodemailer");
var config = require('./config.js');

var model = {};
model['users'] = require('./model.users.js');
model['groups'] = require('./model.groups.js');

var onSocketMessagesSend = function(socket, data, user) {
	var opts = {
		objectId: user.objectId,
		success: function(info) {
			// setup e-mail data with unicode symbols
			var mailOptions = {
			    from: user.name + " <" + user.email + ">", // sender address
			    to: data.to, // list of receivers
			    subject: data.subject, // Subject line
			    text: data.text, // plaintext body
			    html: data.html // html body
			}
			messagesSend(user, mailOptions);
		},
		error: function(error) {
			console.log("error in onSocketMessagesSend()");
			console.log(error);
		}
	}
	model['users'].getUserDetails(opts);
}

var messagesSend = function(user, mailOptions) {

  	// exchange code for (a refreshable) token
  	var origin = user.origin;
  	var google_config = eval("config.google_config_" + origin);

	// create reusable transport method (opens pool of SMTP connections)
	var smtpTransport = nodemailer.createTransport("SMTP",{
	    service: "Gmail",
		auth: {
			XOAuth2: {
				user: user.email,
				clientId : google_config.client_id,
				clientSecret : google_config.client_secret,
				refreshToken: user.refresh_token,
				accessToken: user.access_token
			}
		}
	});

	// send mail with defined transport object
	smtpTransport.sendMail(mailOptions, function(error, response){
	    if (error) {
	        console.log(error);
	    } else {
	        console.log("Message sent: " + response.message);
	    }

	    // if you don't want to use this transport object anymore, uncomment following line
	    smtpTransport.close(); // shut down the connection pool, no more messages
	});
}

exports.onSocketMessagesSend = onSocketMessagesSend;
