var nodemailer = require("nodemailer");
var config = require('./config.js');

var model = {};
model['users'] = require('./model.users.js');
model['groups'] = require('./model.groups.js');

/**
 * send message handler, gets user info + group info then send the message
 */
var onSocketMessagesSend = function(socket, data, user) {
	console.log("onSocketMessagesSend()");
	var group_opts = groupOpts(data, user);
	model['groups'].findByGroupId(group_opts);
}


/**
 * build the group opts search
 */
var groupOpts = function(data, user) {
	return {
		object_id : data.group_id,
		success : function(group) {
			var user_opts = userOpts(data, user.objectId, group.get("recipients"));
			model['users'].getUserDetails(user_opts);
		},
		error: function(error) {
			// TODO
			console.log("error in onSocketMessagesSend");
			console.log(error);
		}
	} 
}

/**
 * build the user opts search
 */
var userOpts = function(data, object_id, recipients) {
	return {
		object_id: object_id,
		success: function(user) {
			var mailOptions = {
			    from: user.get("name") + " <" + user.get("email") + ">", // sender address
			    to: recipients, // list of receivers
			    subject: data.subject, // Subject line
			    text: data.text, // plaintext body
			    html: data.html + "<br><br>Sent from <a href=\"brif.us\">brif.us</a> - \"build relationships\" " // html body
			}
			messagesSend(user, mailOptions);
		},
		error: function(error) {
			console.log("error in onSocketMessagesSend()");
			console.log(error);
		}
	}
}

/**
 * sends the message with the provided mail options 
 */
var messagesSend = function(user, mailOptions) {
	console.log("messagesSend()")
	console.log(mailOptions);

  	// exchange code for (a refreshable) token
  	var origin = user.get("origin");
  	var google_config = eval("config.google_config_" + origin);
  	var oauth = {
		user: user.get("email"),
		clientId : google_config.client_id,
		clientSecret : google_config.client_secret,
		refreshToken: user.get("refresh_token"),
		accessToken: user.get("access_token")
	};
	console.log(oauth);

	// create reusable transport method (opens pool of SMTP connections)
	var smtpTransport = nodemailer.createTransport("SMTP",{
	    service: "Gmail",
		auth: {
			XOAuth2: oauth
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

module.exports = {
	onSocketMessagesSend : onSocketMessagesSend
};
