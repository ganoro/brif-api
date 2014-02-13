var nodemailer = require("nodemailer");
var config = require('./config.js');
var imap = require('imap');
var xoauth2 = require("xoauth2");
var fs = require('fs');

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
	var signature = "<br/>" + (data.signature || "<div class=\"brif_hide\"><br/><br>Sent from <a href=\"http://brif.us\">brif.us</a> - \"Treasure your relationships\"</div>");

	var mailOptions = {
		headers : { 'X-Brif' : data.unique_id + ":" + socket.id },
		from: user.name + " <" + user.email + ">", // sender address
		to: recipients, // list of receivers
		subject: subject, // Subject line
		text: text, // plaintext body
		html: html + signature // html body
	}
	console.log(data.attachments);
	if (data.attachments) {
		mailOptions.attachments = data.attachments;
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
	var mailOptions = {
		email: user.email, 
		callback : getUnread,
		emit : function(results) {
			// console.log(results);
			socket.emit('messages:fetch_unread_imap', { data : results});
		}
	}
	executeMailOptions(user, mailOptions);
}

var onSocketMessagesSearch = function(socket, data, user) {
	console.log("onSocketMessagesSearch()");
	var mailOptions = {
		email: user.email, 
		query : data.query,
		callback : getSearch,
		emit : function(results) {
			model['messages'].findByGoogleMsgId({
				google_msg_id : results,
				user_id : user.objectId,
				success : function(results) {
					socket.emit('messages:search', { data : results });
				},
				error : function() {
					socket.emit('messages:search', { error : arguments });
				}
			})
		}
	}
	executeMailOptions(user, mailOptions);
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
		// debug : console.log, 
		keepalive : false
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
		function endConnection() {
			console.log("closing imap connection");
			connection.end();
			connection.destroy();
		}

		for (var i = mailOptions.messages_id.length - 1; i >= 0 ; i--) {
			var uid = mailOptions.messages_id[i];
			console.log(uid);
			if (uid == null) {
				return endConnection();
			}
			var ec = (i == 0 ? endConnection : undefined);
			if (mailOptions.seen) {
				connection.addFlags(uid, '\\Seen');
				connection.addFlags(uid, '\\Seen', ec);
			} else {
				connection.delFlags(uid, '\\Seen');
				connection.delFlags(uid, '\\Seen', ec);
			}
		};
	});
}

var getUnread = function(connection, mailOptions) {
	console.log("getUnread()");
	connection.openBox('INBOX', false, function(err, box) {
		if (err) return;
		connection.search([ 'UNSEEN'], function(err, results) {
			if (err) return;
			if (results == null || results.length ==0) {
				connection.end();
				connection.destroy();
				return mailOptions.emit(results);
			}
		    var f = connection.fetch(results, { 
				bodies: 'HEADER.FIELDS (FROM TO CC DATE)',
		    });
		    var data = {};
			f.on('message', function(msg, seqno) {
				data[seqno] = {};
				msg.on('body', function(stream, info) {
					var buffer = '';
					stream.on('data', function(chunk) {
						buffer += chunk.toString('utf8');
					});
					stream.once('end', function() {
						data[seqno]['h'] = imap.parseHeader(buffer);
					});
				});
				msg.once('attributes', function(attrs) {
					data[seqno]['a'] = attrs["x-gm-msgid"];
				});
			});
			f.once('error', function(err) {
				console.log('Fetch error: ' + err);
			});
			f.once('end', function() {
				mailOptions.emit(data);
				connection.end();
				connection.destroy();
		connection.destroy();
				console.log('Done fetching all messages!');
			});
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
        	console.log(response.messageId); // Message-ID value used
	    }

	    if (mailOptions.attachments) {
	    	for (var i = mailOptions.attachments.length - 1; i >= 0; i--) {
	    		fs.unlink(mailOptions.attachments[i].filePath);
	    	};
	    }

	    // if you don't want to use this transport object anymore, uncomment following line
	    smtpTransport.close(); // shut down the connection pool, no more messages
	});
}

var getSearch = function(connection, mailOptions) {
	console.log("getSearch()");

	connection.openBox('INBOX', false, function(err, box) {
		if (err) return;
		connection.search([[ 'X-GM-RAW', mailOptions.query]] , function(err, results) {
			if (err) return;
			if (results == null || results.length ==0) {
				connection.end();
				connection.destroy();
				return mailOptions.emit(results);
			}
			results = results.slice(-20);
		    var f = connection.fetch(results, { });
		    var data = [];
			f.on('message', function(msg, seqno) {
				msg.once('attributes', function(attrs) {
					data.push(attrs["x-gm-msgid"]);
				});
			});
			f.once('error', function(err) {
				console.log('Fetch error: ' + err);
			});
			f.once('end', function() {
				mailOptions.emit(data);
				connection.end();
				connection.destroy();
				console.log('Done fetching all messages!');
			});
      	});
	});	
}

module.exports = {
	onSocketMessagesSend : onSocketMessagesSend,
	onSocketMessagesUnread :onSocketMessagesUnread,
	onSocketMessagesSearch :onSocketMessagesSearch,
	onSocketMessagesMarkAs : onSocketMessagesMarkAs
};
