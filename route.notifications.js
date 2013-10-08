var config = require('./config.js');
var xoauth2 = require("xoauth2");
var minpubsub = require('minpubsub/minpubsub');
var request = require('request');
var xml2js = require('xml2js').parseString;
var $ = require('jquery').create();

var nots = {};
var model = {};
model['users'] = require('./model.users.js');
model['messages'] = require('./model.messages.js');

/**
 * @api POST /notification/notify 
 * Enables Nix to notify sockets about change events 
 */
var notify = function(req, res){
	// notification params
	var data = req.body.data;
	var email = req.body.email;
	var entity = req.body.entity;
	var type = req.body.type;	
	if (entity == null || email == null) {
		sendUnsupportedOperation(res, "missing entity and email fields");
		return;
	}

	res.send("sending..."); // TODO send before execute?

	if (entity == "messages") {
		notifyMessagesListsners(email, data);
	}
};

var sendUnsupportedOperation = function(res, msg) {
	res.status(400).send(JSON.stringify({ error: "Unsupported operation", message : msg}));		
}

var notifyMessagesListsners = function(email, data) {
	console.log("notifyMessagesListsners");

	if (typeof nots[email] === "undefined") {
		return;
	}

	for (var client_id in nots[email].sockets) {
		var topic = messagesTopicName(client_id, email);
		minpubsub.publish(topic, [ data ]);
	}
}

/**
 * On Socket messages
 */
var onSocketSetup = function(socket, data, user) {
	console.log("connected to : " + socket.id + ", with email : " + data.email);
	setupClient(socket.id, data.email);
	var opts = {
		socket : socket,
		success : function(user) {
			// exchange code for (a refreshable) token
		  	var origin = user.get("origin");
		  	var google_config = eval("config.google_config_" + origin);
			var xoauth2gen = xoauth2.createXOAuth2Generator({
			    user: user.get("email"),
			    clientId : google_config.client_id,
			    clientSecret : google_config.client_secret,
			    refreshToken: user.get("refresh_token")
			});
			var process = {
				socket : socket,
				token : setSocketDetails
			}
			xoauth2gen.getToken(process.token.bind(process));
		}
	}
	model['users'].findByEmail(data.email, opts);
}

var setSocketDetails = function(err, token, access_token) {
	console.log("setSocketDetails()");
	console.log(this);
	console.log(process);

	if (err) {
		// TODO : internal error
		return console.log(err);
	} else {
		var data = { 
			"objectId" : user.id, 
			"origin" : user.get("origin"), 
			"refresh_token" : user.get("refresh_token"), 
			"token" : token, 
			"access_token" : access_token,
			"email" : user.get("email"), 
		};
		console.log(data);
		process.socket.set('user', JSON.stringify(data));
		socket.emit('setup:completed');
	}
}

var onSocketDisconnect = function(socket) {
	unsubscribeAllTopicsToClient(socket.id);
}

var onSocketSubscribeMessagesListener = function(socket, data, user) {
	console.log("onSocketSubscribeMessagesListener")
  	subscribeMessagesListener(socket.id, user.email, function(message) {
  		console.log("messages:event");
		socket.emit('messages:event', message);
	});
}

var onSocketUnsubscribeMessagesListener = function(socket, data, user) {
	console.log("onSocketUnsubscribeMessagesListener")
  	unsubscribeMessagesListener(socket.id, user.email);
}

var onSocketSubscribeChannelListener = function(socket, data, user) {
	console.log("onSocketSubscribeChannelListener")
  	subscribeChannelListener(socket.id, user.email, function(message) {
  		console.log("channel:event");
		socket.emit('channel:event', message);
	});
}

var onSocketUnsubscribechannelListener = function(socket, data, user) {
	console.log("onSocketUnsubscribechannelListener")
  	unsubscribeChannelListener(socket.id, user.email);
}


var onSocketMessagesMarkAs = function(socket, data, user) {
	var messages_id = data.messages_id;
	var unseen = data.unseen;
	if (!messages_id || !unseen) {
		// TODO internal error
	}

	messagesMarkAs(socket, messages_id, unseen, user);
}

var onSocketMessagesUnread = function(socket, data, user) {
	console.log("onSocketMessagesUnread()");
	messagesUnread(socket, data, user);
}

var onSocketMessagesFetch = function(socket, data, user) {
	console.log("onSocketMessagesFetch")
	if (data.per_page == null || data.page == null || data.original_recipients_id == null) {
		// TODO internal error
	}
	messagesFetch(socket, user.objectId, data);
}

var messagesTopicName = function(client_id, email) {
	return email + "/" + client_id + "/m";
}

var channelTopicName = function(channel_id) {
	return channel_id + "/c";
}

var registerHandler = function(email, client_id, topic, handler) {
	nots[email].sockets[client_id].topics[topic] = handler;
}

var resolveHandler = function(client_id, email, topic) {
	if (nots[email]) {
		return nots[email].sockets[client_id].topics[topic];	
	} else {
		return null;
	}
}

var setupClient = function(client_id, email) {
	console.log(client_id + " " + email)
	nots[email] = nots[email] || { sockets : {} };
	nots[email].sockets[client_id] = nots[email].sockets[client_id] || { topics : [] };
}

var subscribeMessagesListener = function(client_id, email, callback) {	
	var topic = messagesTopicName(client_id, email);
	var handler = minpubsub.subscribe(topic, function(msg){
		console.log("[" + topic + "] is executing with message " + msg);
		callback(msg);
	});
	registerHandler(email, client_id, topic, handler);
}

var unsubscribeMessagesListener = function(client_id, email) {
	var topic = messagesTopicName(client_id, email);
	var handler = resolveHandler(client_id, email, topic);
	if (handler) {
		minpubsub.unsubscribe(handler);	
	}
};

var subscribeChannelListener = function(typer, channel_id, callback) {	
	var topic = channelTopicName(client_id, email);
	var handler = minpubsub.subscribe(topic, function(msg){
		console.log("[" + topic + "] is executing with message " + msg);
		callback(msg);
	});
	registerHandler(email, client_id, topic, handler);
}

var unsubscribeChannelListener = function(client_id, email) {
	var topic = channelTopicName(client_id, email);
	var handler = resolveHandler(client_id, email, topic);
	if (handler) {
		minpubsub.unsubscribe(handler);	
	}
};


var messagesFetch = function(socket, user_id, data) {
	var per_page = data.per_page;
	var page = data.page;
	var original_recipients_id = data.original_recipients_id;	

	var opts = {
		per_page : per_page, 
		page : page, 
		original_recipients_id : original_recipients_id, 
		user_id : user_id, 
		success : function(data) {
			console.log(opts);
			console.log('messages:fetch:' + opts.original_recipients_id);
			socket.emit('messages:fetch:' + opts.original_recipients_id , { data : data });
		}
	};
	model['messages'].findByOriginalRecipientsId(opts);
}

/**
 * fetch unread
 */
var messagesUnread = function(socket, data, user) {
	console.log("messagesUnread()")

	var process = {
		socket : socket,
		messages : function(error, result) {
			var google_msg_id = [];
			for (var i = 0; i < result.feed.entry.length; i++) {
				var entry = result.feed.entry[i].id[0];
				var last = entry.lastIndexOf(":") + 1;
				google_msg_id.push(entry.substring(last));
			};
			var opt = {
				google_msg_id : google_msg_id,
				user_id : user.objectId,
				success : function(messages) {
					console.log("emitting messages");
					process.socket.emit('messages:unread', { 
						data : messages 
					});
				},
				error : function(e) {
					// TODO : handle errors
				}
			}
			model['messages'].findByGoogleMsgId(opt);
		},

		parse : function(e, r, body) {
			var messages = process.messages;
			if (e) {
				// TODO : internal error
				return console.log(e);
			}
			xml2js(body, messages);
		}
	};
	var url = 'https://mail.google.com/mail/feed/atom';
	request.get(url, { headers : { "Authorization" : "Bearer " + user.access_token }}, process.parse);	
}

var unsubscribeAllTopicsToClient = function(email, client_id) {
	if (!nots[email] || !nots[email].sockets) {
		console.log("client is missing in notifications array");
		return;
	}
	for (var topic in nots[email].sockets[client_id].topics) {
		var handler = resolveHandler(client_id, email, topic);
		minpubsub.unsubscribe(handler);
	}

	delete nots[email].sockets[client_id];
}

// exports public functions
module.exports = {
	notify : notify,
	onSocketSetup : onSocketSetup,
	onSocketDisconnect : onSocketDisconnect,
	onSocketSubscribeMessagesListener : onSocketSubscribeMessagesListener,
	onSocketUnsubscribeMessagesListener : onSocketUnsubscribeMessagesListener,
	onSocketMessagesFetch : onSocketMessagesFetch,
	onSocketMessagesUnread : onSocketMessagesUnread
};
