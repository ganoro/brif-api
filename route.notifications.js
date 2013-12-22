var config = require('./config.js');
var xoauth2 = require("xoauth2");
var minpubsub = require('minpubsub/minpubsub');
var request = require('request');
var xml2js = require('xml2js').parseString;
var $ = require('jquery').create();
var templates = require('./templates.js');

var user_event_handlers = {};
var channel_event_handlers = {};

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

	if (typeof user_event_handlers[email] === "undefined") {
		return;
	}

	for (var client_id in user_event_handlers[email].sockets) {
		var topic = messagesTopicName(client_id, email);
		minpubsub.publish(topic, [ data ]);
	}
}

/**
 * On Socket messages
 */
var onSocketSetup = function(socket, data, user) {
	console.log("connected to : ", socket.id, ", with email : ", data.email);
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
				token : function(err, token, access_token) {
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
							"name" : user.get("name"), 
							"email" : user.get("email"), 
						};
						socket.set('user', JSON.stringify(data));
						socket.emit('setup:completed');
					}
				}
			}
			xoauth2gen.getToken(process.token);
		}
	}
	model['users'].findByEmail(data.email, opts);
}

var onSocketDisconnect = function(socket) {
	unsubscribeAllTopicsToClient(socket.id);
}

var onSocketSubscribeMessagesListener = function(socket, data, user) {
	console.log("onSocketSubscribeMessagesListener")
  	subscribeMessagesListener(socket.id, user.email, function(message) {
		socket.emit('messages:event', message);
	});
}

var onSocketUnsubscribeMessagesListener = function(socket, data, user) {
	console.log("onSocketUnsubscribeMessagesListener")
  	unsubscribeMessagesListener(socket.id, user.email);
}

var onSocketSubscribeChannelsListener = function(socket, data, user) {
	console.log("onSocketSubscribeChannelsListener");
	if (data.channel_id == null) {
		// TODO
	}
  	subscribeChannelListener(socket.id, user.email, data.channel_id, socket);
}

var onSocketUnsubscribeChannelsListener = function(socket, data, user) {
	console.log("onSocketUnsubscribeChannelsListener");
	if (data.channel_id == null) {
		// TODO
	}
  	unsubscribeChannelListener(data.channel_id, socket.id, socket);
}

var onSocketMessagesFetchTimeline = function(socket, data, user) {
	console.log("onSocketMessagesFetchTimeline()");
	messagesFetchTimeline(socket, data, user);
}

var onSocketMessagesFetchThread = function(socket, data, user) {
	console.log("onSocketMessagesFetchThread()");
	messagesFetchThread(socket, data, user);
}

var onSocketMessagesFetchUnread = function(socket, data, user) {
	console.log("onSocketMessagesFetchUnread()");
	messagesFetchUnread(socket, data, user);
}

var onSocketMessagesFetch = function(socket, data, user) {
	console.log("onSocketMessagesFetch");
	if (data.per_page == null || data.page == null || data.recipients_id == null) {
		// TODO internal error
	}
	messagesFetch(socket, user.objectId, data);
}

var onSocketChannelsSend = function (socket, data, user) {
	console.log("onSocketChannelsSend");
	if (data.channel_id == null || data.message == null) {
		// TODO internal error
	}
	var channel_id = data.channel_id;
	for (var client_id in channel_event_handlers[channel_id]) {
		var socket = channel_event_handlers[channel_id][client_id];
		socket.emit('channels:event:' + channel_id, { 
			sender : user.email, 
			message : data.message 
		});
	}
}

var messagesTopicName = function(client_id, email) {
	return email + "/" + client_id + "/m";
}

var registerHandler = function(email, client_id, topic, handler) {
	user_event_handlers[email].sockets[client_id].topics[topic] = handler;
}

var registerDisposers = function(email, client_id, disposer) {
	user_event_handlers[email].sockets[client_id].disposers.push(disposer);
}

var resolveHandler = function(client_id, email, topic) {
	if (user_event_handlers[email]) {
		return user_event_handlers[email].sockets[client_id].topics[topic];	
	} else {
		return null;
	}
}

var registerSocket = function(channel_id, client_id, socket) {
	channel_event_handlers[channel_id] = channel_event_handlers[channel_id] || {};
	channel_event_handlers[channel_id][client_id] = channel_event_handlers[channel_id][client_id] || socket;
}

var unregisterSocket = function(channel_id, client_id) {
	if (channel_event_handlers[channel_id]) {
		delete channel_event_handlers[channel_id][client_id];
		if (Object.keys(channel_event_handlers[channel_id]).length == 0) {
			delete channel_event_handlers[channel_id];
		}
	}
}

var setupClient = function(client_id, email) {
	console.log("setting up ", client_id, " with ", email);
	user_event_handlers[email] = user_event_handlers[email] || { sockets : {} };
	user_event_handlers[email].sockets[client_id] = user_event_handlers[email].sockets[client_id] || { topics : [], disposers: [] };
}

var subscribeMessagesListener = function(client_id, email, callback) {	
	var topic = messagesTopicName(client_id, email);
	var handler = minpubsub.subscribe(topic, function(msg){
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

var subscribeChannelListener = function(client_id, email, channel_id, socket) {	
	registerSocket(channel_id, client_id, socket);

	// register a disposer to the channel listener
	var disposer = function() {
		unregisterSocket(channel_id, client_id);
	};
	registerDisposers(email, client_id, disposer);
};

var unsubscribeChannelListener = function(channel_id, client_id, socket) {
	unregisterSocket(channel_id, client_id, socket); 
};

var messagesFetch = function(socket, user_id, data) {
	var opts = {
		per_page : data.per_page, 
		page : data.page, 
		recipients_id : data.recipients_id, 
		only_attachments : data.only_attachments,
		user_id : user_id, 
		success : function(data) {
			console.log('messages:fetch:' + opts.recipients_id);
			socket.emit('messages:fetch:' + opts.recipients_id , { data : data });
		}
	};
	model['messages'].findByRecipientsId(opts);
}


/**
 * fetch all (read + unread)
 */
var messagesFetchTimeline = function(socket, data, user) {
	console.log("messagesFetchTimeline()")

	var opt = {
		user_id : user.objectId,
		success : function(messages) {
			console.log("emitting messages");
			socket.emit('messages:fetch_timeline', { data : messages });
		},
		error : function(e) {
			// TODO : handle errors
		}
	}
	model['messages'].fetchAll(opt);
}

/**
 * fetch all messages from specific thread id + rid 
 */
var messagesFetchThread = function(socket, data, user) {
	console.log("messagesFetchThread()")
	var opt = {
		socket : socket,
		google_trd_id : data.google_trd_id,
		recipients_id : data.recipients_id,
		user_id : user.objectId,
		per_page : data.per_page,
		page : data.page,
		success : function(messages) {
			console.log("emitting messages");
			opt.socket.emit('messages:fetch_thread', { data : messages });
		},
		error : function(e) {
			// TODO : handle errors
		}
	}
	model['messages'].findByGoogleTrdId(opt);
}

/**
 * fetch all unread messages as array
 */
var messagesFetchUnread = function(socket, data, user) {
	console.log("messagesFetchUnread()")

	var process = {
		socket : socket,
		messages : function(error, result) {
			var google_msg_id = [];
			if (result.feed.entry != null) {
				for (var i = 0; i < result.feed.entry.length; i++) {
					var entry = result.feed.entry[i].id[0];
					var last = entry.lastIndexOf(":") + 1;
					google_msg_id.push(entry.substring(last));
				};
			}
			console.log("emitting messages");

			model['messages'].findByGoogleMsgId({ 
				google_msg_id : google_msg_id,
				user_id : user.objectId,
				success : function(unread) {
					result = [];
				  	for (var i = unread.length - 1; i >= 0; i--) {
				    	result.push( { 
				    		recipients_id : unread[i].get("recipients_id"), 
				    		message_id : unread[i].get("message_id") 
				    	}); 
				  	};
				  	process.socket.emit('messages:fetch_unread', { data : result });
				}, 
				error : function(e) {
					process.socket.emit('messages:fetch_unread', { error : e });
				}
			});
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
	if (!user_event_handlers[email] || !user_event_handlers[email].sockets) {
		console.log("client is missing in notifications array");
		return;
	}
	for (var topic in user_event_handlers[email].sockets[client_id].topics) {
		var handler = resolveHandler(client_id, email, topic);
		minpubsub.unsubscribe(handler);
	}

	for (var disposer in user_event_handlers[email].sockets[client_id].disposers) {
		disposer();
	}

	delete user_event_handlers[email].sockets[client_id];
}

// exports public functions
module.exports = {
	notify : notify,
	onSocketSetup : onSocketSetup,
	onSocketDisconnect : onSocketDisconnect,
	onSocketSubscribeMessagesListener : onSocketSubscribeMessagesListener,
	onSocketUnsubscribeMessagesListener : onSocketUnsubscribeMessagesListener,
	onSocketMessagesFetch : onSocketMessagesFetch,
	onSocketMessagesFetchTimeline : onSocketMessagesFetchTimeline,
	onSocketMessagesFetchUnread : onSocketMessagesFetchUnread,
	onSocketMessagesFetchThread : onSocketMessagesFetchThread,
	onSocketSubscribeChannelsListener : onSocketSubscribeChannelsListener,
	onSocketUnsubscribeChannelsListener : onSocketUnsubscribeChannelsListener,
	onSocketChannelsSend : onSocketChannelsSend
};
