var nodemailer = require("nodemailer");
var config = require('./config.js');
var imap = require('imap');
var xoauth2 = require("xoauth2");

var model = {};
model['users'] = require('./model.users.js');
model['messages'] = require('./model.messages.js');


/**
 * send message handler, gets user info + group info then send the message
 */
var onSocketMessagesSend = function(socket, data, user) {
	console.log("onSocketMessagesSend()");
	var recipients = data.recipients;
	var subject = data.subject;
	var text = data.text;
	var html = data.html;
	var signature = data.signature || "<div class=\"brif_hide\"><br><br>Sent from <a href=\"http://brif.us\">brif.us</a> - \"Treasure your relationships\"</div>";

	var mailOptions = {
		headers : { 'X-sent-by' : 'brif' },
		from: user.name + " <" + user.email + ">", // sender address
		to: recipients, // list of receivers
		subject: subject, // Subject line
		text: text, // plaintext body
		html: html + signature // html body
	}
	messagesSend(user, mailOptions);
}

/**
 * send message handler, gets user info + group info then send the message
 */
var onSocketMessagesMarkAs = function(socket, data, user) {
	console.log("onSocketMessagesMarkAs()");
	var mailOptions = {
		email: user.email, 
		messages_id : data.messages_id,
		seen : data.seen,
		callback : markAs
	}
	executeMailOptions(user, mailOptions);
}

var onSocketMessagesUnread = function(socket, data, user) {
	console.log("onSocketMessagesUnread()");
	var user_opts = userUnreadOpts(data, user.objectId, socket);
	model['users'].getUserDetails(user_opts);
}

/**
 * prepare mail options to the unread procedure
 */
var userUnreadOpts = function(data, object_id, socket) {
	console.log(data);
	return {
		object_id: object_id,
		success: function(user) {
			var mailOptions = {
			    email: user.get("email"), 
			    page : data.page,
			    per_page : data.per_page,
			    callback : getUnread,
			    socket : socket
			}
			executeMailOptions(user, mailOptions);
		},
		error: function(error) {
			console.log("error in userUnreadOpts()");
			console.log(error);
		}
	};
}

/**
 * sends the message with the provided mail options 
 */
var executeMailOptions = function(user, mailOptions) {
	console.log("executeMailOptions()");
	var connection = connect(user.token, user, mailOptions);
}

var connect = function(token, user, mailOptions) {
	var connection = new imap({
		tls: true,
        tlsOptions: { rejectUnauthorized: false },
		user : user.email,
		xoauth2 : token,
		host: 'imap.gmail.com',
		port: 993,
		secure : true,
		keepalive : false,
		debug : console.log 
	});
	connection.on('ready', function() {
		console.log('ready');
		mailOptions.callback(connection, mailOptions);
	});
	connection.on('error', function(err) {
		console.log(err);
	});

	connection.on('end', function() {
		console.log('Connection ended');
	});
	connection.connect(function(err) {
  		if (err) throw err;
	});
}

var markAs = function(connection, mailOptions) {
	console.log("markAs()");
	connection.openBox('[Gmail]/All Mail', false, function(err, box) {
		for (var i = mailOptions.messages_id.length - 1; i >= 0 ; i--) {
			var uid = mailOptions.messages_id[i];
			console.log(uid);
			if (mailOptions.seen) {
				connection.addFlags(uid, '\\Seen');
			} else {
				connection.delFlags(uid, '\\Seen');
			}
		};
	});
}

var getUnread = function(connection, mailOptions) {
	connection.openBox('[Gmail]/All Mail', false, function(err, box) {
		if (err) return;
		connection.search([ 'UNSEEN'], function(err, results) {
    		var data;
    		if (err || results == null) {
    			fata = [];
    		} else {
	    		// data = results.slice(mailOptions.page*mailOptions.per_page, mailOptions.per_page)
	    		data = results.slice(-3, -1)
    			console.log(data);
    		}
    		var opts = {
    			success: function(d) {
    				console.log(d);
	    			mailOptions.socket.emit('messages:unread', d);
    			}
    		}
    		model['messages'].findById(data, opts);
      	});
	});	
}

/**
 * sends the message with the provided mail options 
 */
var messagesSend = function(user, mailOptions) {
	console.log("messagesSend()")
	console.log(mailOptions);

  	// exchange code for (a refreshable) token
  	var origin = user.origin;
  	var google_config = eval("config.google_config_" + origin);
  	var oauth = {
		user: user.email,
		clientId : google_config.client_id,
		clientSecret : google_config.client_secret,
		refreshToken: user.refresh_token,
		accessToken: user.access_token
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
	        console.log(response);
	        console.log("Message sent: " + response.message);
	        console.log(response.message); // response from the server
        	console.log(response.messageId); // Message-ID value used
	    }

	    // if you don't want to use this transport object anymore, uncomment following line
	    smtpTransport.close(); // shut down the connection pool, no more messages
	});
}

module.exports = {
	onSocketMessagesSend : onSocketMessagesSend,
	onSocketMessagesMarkAs : onSocketMessagesMarkAs
};
