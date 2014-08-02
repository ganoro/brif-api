var config = require('./config.js');
var xoauth2 = require("xoauth2");
var minpubsub = require('minpubsub/minpubsub');
var xml2js = require('xml2js').parseString;
var $ = require('jquery').create();
var templates = require('./templates.js');

var user_event_handlers = {};
var channel_event_handlers = {};

var model = {};
model['users'] = require('./model.users.js');
model['messages'] = require('./model.messages.js');
model['settings'] = require('./model.settings.js');

/**
 * @api POST /notification/notify 
 * Enables Nix to notify sockets about change events 
 */
var notify = function(req, res){
	res.send("sending..."); // TODO send before execute?

	// notification params
	var data = req.body.data;
	var email = req.body.email;
	var entity = req.body.entity;
	var type = req.body.type;	

	// validation
	if (entity == null || email == null) {
		var msg = "missing entity and email fields";
		res.status(400).send(JSON.stringify({ error: "Unsupported operation", message : msg}));	
		return;
	}

	if (entity == "messages") {
		notifyMessagesListsners('messages:event', email, data);
	}
};

var notifyMessagesListsners = function(message_type, email, data) {
	console.log("notifyMessagesListsners");

	if (typeof user_event_handlers[email] === "undefined") {
		return;
	}

	for (var client_id in user_event_handlers[email].sockets) {
		var topic = messagesTopicName(client_id, email);
		minpubsub.publish(topic, [ message_type, data ]);
	}
}

/**
 * On Socket messages
 */
var onSocketSetup = function(socket, data, user) {
	console.log("onSocketSetup");
	
	var opts = {
		socket : socket,
		success : function(user) {
			// exchange code for (a refreshable) token
			if (!user) {
				return;
			}

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
				data: data,
				token : function(err, token, access_token) {
					if (err) {
						// TODO : internal error
						socket.emit('setup:error');
						return console.log(err);
					} else {
						var user_data = { 
							"objectId" : user.id, 
							"origin" : user.get("origin"), 
							"refresh_token" : user.get("refresh_token"), 
							"token" : token, 
							"access_token" : access_token,
							"name" : user.get("name"), 
							"email" : user.get("email"), 
							"timeout" : xoauth2gen.timeout
						};
						socket.set('user', JSON.stringify(user_data));

						// if this call triggerd to renew the token, call the post event
						// without emitting the setup:completed event
						if (data.post_event != null) {
							return data.post_event(user_data);
						}

						// announce on setup completed
						socket.emit('setup:completed');

						// setup the messages liseneter
						subscribeMessagesListener(socket, user);

						// first signin action
						if (user.get('first_signin') || typeof (user.get('first_signin')) === "undefined") {
							socket.emit('setup:first_signin', { email : user.get("email") });
							user.set('first_signin', false);
							user.save();
						}

						// announce the settings
						model['settings'].getAllSettings(user.id, {
							success : function(r) {
								if (r) {
									var result = [];
									r.forEach(function(elem, index) {
										result.push({ key : elem.get('key'), value : elem.get('value')})
									})
									socket.emit('settings:all', { data : result });	
								}
							},
							error: function () {
								socket.emit('settings:all', {error : arguments});
							}
						})
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

var onSocketMessagesFetchPreviousThreads = function(socket, data, user) {
	console.log("onSocketMessagesFetchPreviousThreads()");
	messagesLoadPreviousThreads(socket, data, user);
}

var onSocketMessagesFetch = function(socket, data, user) {
	console.log("onSocketMessagesFetch");
	if (data.per_page == null || data.page == null || data.recipients_id == null) {
		// TODO internal error
	}
	messagesFetch(socket, user.objectId, data);
}

var onSocketMessagesFetchByGoogleId = function(socket, data, user) {
	console.log("onSocketMessagesFetchByGoogleId");
	if (data.google_msg_id == null || data.recipients_id == null) {
		// TODO internal error
	}
	messagesFetchByGoogleMsgId(socket, data, user);
}

var onSocketMessagesNear = function(socket, data, user) {
	console.log("onSocketMessagesNear");
	if (data.limit == null || data.google_msg_id == null || data.recipients_id == null) {
		// TODO internal error
	}
	messagesNear(socket, data, user);
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

var subscribeMessagesListener = function(socket, user) {
	console.log('subscribeMessagesListener')

	var client_id = socket.id;
	var email = user.get("email");

	// setup client
	console.log("setting up handlers for client ", client_id, " with email: ", email);
	user_event_handlers[email] = user_event_handlers[email] || { sockets : {} };
	user_event_handlers[email].sockets[client_id] = user_event_handlers[email].sockets[client_id] || { topics : [], disposers: [] };

	// register handler
	var topic = messagesTopicName(client_id, email);
	var handler = minpubsub.subscribe(topic, function( type, message ) {
		socket.emit(type, message)
	});
	registerHandler(email, client_id, topic, handler);
}

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
		},
	    error: function() {
	    	socket.emit('messages:fetch:' + opts.recipients_id , { error : "error fetching messages" });	
	    }
	};
	model['messages'].findByRecipientsId(opts);
}

var messagesFetchByGoogleMsgId = function(socket, data, user) {
	var ops = {
		google_msg_id : data.google_msg_id,
		user_id : user.objectId,
		success : function(results) {
			socket.emit('messages:fetch_google_msg_id', { data : results });
		},
		error : function() {
			socket.emit('messages:fetch_google_msg_id', { error : arguments });
		}
	};
	model['messages'].findByGoogleMsgId(ops);
}

/**
 * fetch all (read + unread)
 */
var messagesFetchTimeline = function(socket, data, user) {
	console.log("messagesFetchTimeline()")

	var opt = {
		user_id : user.objectId,
		aggreagated : [],
		success : function(messages, oldest_id) {
			if (messages.length < 10) {
				opt.aggreagated = messages;
				opt.sooner_than = oldest_id;
				model['messages'].fetchAll(opt);
			} else {
				socket.emit('messages:fetch_timeline', { data : messages });	
			}
		},
		error : function(e) {
			// TODO : handle errors
		}
	}
	if (data.sooner_than) {
		opt.sooner_than = data.sooner_than;
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
		id : data.google_trd_id.toString() + data.recipients_id.toString(),
		success : function(messages) {
			console.log(opt.id)
			var result = {
				count : messages.length,
				data : messages.slice(0, Math.min(messages.length, data.per_page))
			}
			opt.socket.emit('messages:fetch_thread:' + opt.id, result);
		},
		error : function(e) {
			opt.socket.emit('messages:fetch_thread:' + opt.id, arguments);
		}
	}
	if (data.page == 0) {
		model['messages'].findFirstPageByGoogleTrdId(opt)
	} else {
		model['messages'].findByGoogleTrdId(opt);
	}
}

var messagesLoadPreviousThreads = function(socket, data, user) {
	console.log("messagesFetchThread()")
	var opt = {
		socket : socket,
		google_trd_id : data.google_trd_id,
		google_msg_id : data.google_msg_id,
		recipients_id : data.recipients_id,
		user_id : user.objectId,
		success : function(messages) {
      		var result = [];
      		var result_trd_id = [ data.google_trd_id ];
			for (var i = 0; i < messages.length; i++) {
				var m = messages[i];
				var trd_id = m.get("google_trd_id");
				if ($.inArray(trd_id, result_trd_id) == -1) {
					result.push(m);
					result_trd_id.push(trd_id);
				}
			};
			opt.socket.emit('messages:fetch_previous_threads', result);
		},
		error : function(e) {
			// TODO : handle errors
		}
	}
	model['messages'].findPreviousThreads(opt);
}

var messagesNear = function(socket, data, user) {
	console.log("messagesNear()")
	var opt = {
		socket : socket,
		google_msg_id : data.google_msg_id,
		recipients_id : data.recipients_id,
		user_id : user.objectId,
		limit : data.limit,
		success : function(messages) {
			opt.socket.emit('messages:near', { data : messages });
		},
		error : function() {
			opt.socket.emit('messages:near', { error : arguments });
		}
	}
	model['messages'].findNear(opt);
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
	notifyMessagesListsners : notifyMessagesListsners,
	onSocketSetup : onSocketSetup,
	onSocketDisconnect : onSocketDisconnect,
	onSocketMessagesFetch : onSocketMessagesFetch,
	onSocketMessagesFetchTimeline : onSocketMessagesFetchTimeline,
	messagesFetchByGoogleMsgId : messagesFetchByGoogleMsgId,
	onSocketMessagesFetchThread : onSocketMessagesFetchThread,
	onSocketMessagesFetchPreviousThreads : onSocketMessagesFetchPreviousThreads,
	onSocketMessagesNear : onSocketMessagesNear,
	onSocketSubscribeChannelsListener : onSocketSubscribeChannelsListener,
	onSocketUnsubscribeChannelsListener : onSocketUnsubscribeChannelsListener,
	onSocketChannelsSend : onSocketChannelsSend
};
