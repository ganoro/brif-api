var nodemailer = require("nodemailer");
var config = require('./config.js');
var imap = require('imap');
var xoauth2 = require("xoauth2");
var fs = require('fs');
var $ = require('jquery').create();


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
		html: html + signature, // html body
		success: function(result) {
			socket.emit("messages:send", { data : result });
		}, error: function() {
			socket.emit("messages:send", { error : arguments });
		}
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
		resolve_all : true,
		messages_id : data.messages_id,
		seen : data.seen,
		callback : markAs,
		emit : function(results) {
			socket.emit('messages:markas', { data : results});
		}
	}
	if (typeof mailOptions.messages_id === "undefined" || mailOptions.messages_id.length == 0) {
		return mailOptions.emit([]);
	}

	executeMailOptions(user, mailOptions);
}

var onSocketMessagesUnread = function(socket, data, user) {
	console.log("onSocketMessagesUnread()");
	var mailOptions = {
		email: user.email, 
		user_id : user.objectId,
		resolve_all : false,		
		callback : getUnread,
		emit : function(google_message_ids) {
			model['messages'].findByGoogleMsgId({
				google_msg_id : google_message_ids,
				user_id : mailOptions.user_id,
				is_select_special : false,
				success : function(result) {
					socket.emit('messages:fetch_unread_imap', { data : result});
					console.log('Done fetching all messages! found: ', result.length);
				}
			});
		}
	}
	executeMailOptions(user, mailOptions);
}

/**
 * Search for new messages after a given google_message_id
 **/
var onSocketMessagesNextOf = function(socket, data, user) {

	// TODO - validation
	if (!data.unreads || !data.message_id) {
		return;
	}

	var opts = {
		message_id : data.message_id,
		user_id : user.objectId,
		success : function(next) {
			var mailOptions = {
				email: user.email, 
				user_id : user.objectId,
				resolve_all : false,		
				callback : getUnread,
				emit : function(google_message_ids) {
					// mark new messages as seen / unseen, 
					// exclude all promotional emails that are already read
					for (var i = next.length - 1; i >= 0; i--) {
						var m = next[i];
						var index = google_message_ids.indexOf(m.get("google_msg_id"));
						var is_unseen = index != -1;

						m.set("unseen", is_unseen);
						if (is_unseen) {
							google_message_ids.splice(index, 1);
						} 
						// if promotion and seen - don't show it 
						if (!is_unseen && m.get("unsubscribe")) {
							next.splice(i, 1);
						}
					};

					// keep only unknown old unread messages - and fetch
					// build the list of read emails that previously were unread (i.e. another client)
					for (var i = data.unreads.length - 1; i >= 0; i--) {
						var id = data.unreads[i];
						var index = google_message_ids.indexOf(id);
						if (index != -1) {
							google_message_ids.splice(index, 1);
							data.unreads.splice(i, 1);
						}
					};
					var find_opts = {
						user_id : user.objectId,
						google_msg_id : google_message_ids,
						success: function(results) {
							socket.emit('messages:next_of', { data : next, unreads: results, reads : data.unreads });
						},
						error: opts.error
					}
					model['messages'].findByGoogleMsgId(find_opts);
				}
			}
			executeMailOptions(user, mailOptions);
		},
		error : function() {
			socket.emit('messages:next_of', { error : arguments });
		}
	}

	model['messages'].fetchAfterMsgId(opts);
}

var onSocketMessagesSearch = function(socket, data, user) {
	console.log("onSocketMessagesSearch()");
	var mailOptions = {
		email: user.email, 
		resolve_all : true,		
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
		if (mailOptions.resolve_all) {
			// resolve all mail folder 
			connection.getBoxes("[Gmail]", function(err, boxes) {
				var c = boxes['[Gmail]'].children;
				if (c) {
					for (var key in c) {
						var obj = c[key];
						var attribs = obj['attribs'];
						if (attribs && $.inArray('\\All', attribs) > -1) {						
							mailOptions.all_folder = '[Gmail]/' + key;
							return mailOptions.callback(connection, mailOptions);
						}
					}
				}
			});
		} else {
			return mailOptions.callback(connection, mailOptions);	
		}
	});
	connection.on('error', function(err) {
		mailOptions.emit([]);
		console.log(err);
		connection.end();
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
	connection.openBox(mailOptions.all_folder, false, function(err, box) {
		function endConnection() {
			mailOptions.emit(mailOptions.messages_id);
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
			if (err || results == null || results.length ==0) {
				mailOptions.emit([]);
				connection.end();
				connection.destroy();
				return
			}
			console.log("unread: ", results.length);

			if (results.length > 20) {
				results = results.slice(-20);
			}

		    var f = connection.fetch(results, { 
				bodies: 'HEADER.FIELDS (FROM)',
		    });
		    var google_message_ids = [];
			f.on('message', function(msg, seqno) {
				msg.once('attributes', function(attrs) {
					google_message_ids.push(attrs["x-gm-msgid"]);
				});
			});
			f.once('error', function(err) {
				console.log('Fetch error: ' + err);
			});
			f.once('end', function() {
				mailOptions.emit(google_message_ids);
				connection.end();
				connection.destroy();
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
        	mailOptions.error(error);	        
	    } else {
	        console.log("Message sent: " + response.message);
        	mailOptions.success(response);
	    }

	    if (mailOptions.attachments) {
	    	for (var i = mailOptions.attachments.length - 1; i >= 0; i--) {
	    		var a = mailOptions.attachments[i];
	    		if (a.filePath) {
	    			fs.unlink(a.filePath);	
	    		}
	    	}
	    }

	    // if you don't want to use this transport object anymore, uncomment following line
	    smtpTransport.close(); // shut down the connection pool, no more messages
	});
}

var getSearch = function(connection, mailOptions) {
	console.log("getSearch()");

	connection.openBox(mailOptions.all_folder, false, function(err, box) {
		if (err) return;
		connection.search([[ 'X-GM-RAW', mailOptions.query]] , function(err, results) {
			if (err) return;
			if (results == null || results.length ==0) {
				connection.end();
				connection.destroy();
				return mailOptions.emit(results);
			}
			console.log('results length is ', results.length);
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
	onSocketMessagesMarkAs : onSocketMessagesMarkAs,
	onSocketMessagesNextOf : onSocketMessagesNextOf
};
