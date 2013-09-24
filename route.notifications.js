var minpubsub = require('minpubsub/minpubsub');
var $ = require('jquery').create();

var nots = {};
var model = {};
model['users'] = require('./model.users.js');
model['groups'] = require('./model.groups.js');
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
	} else if (entity == "groups") {
		notifyGroupListsners(email, req.body);
	}
};

var sendUnsupportedOperation = function(res, msg) {
	res.status(400).send(JSON.stringify({ error: "Unsupported operation", message : msg}));		
}

var notifyGroupListsners = function(email, data) {
	console.log("notifyGroupListsners");

	if (typeof nots[email] === "undefined") {
		return;
	}

	for (var client_id in nots[email].sockets) {
		var topic = groupsTopicName(client_id, email);
		minpubsub.publish(topic, [ data ]);
	}
}

var notifyMessagesListsners = function(email, group_id, msg) {
	if (typeof nots[email] === "undefined") {
		return;
	}

	for (var client_id in nots[email].sockets) {
		var topic = messagesTopicName(client_id, email, group_id);
		minpubsub.publish(topic, msg);
	}
}

/**
 * On Socket messages
 */
var onSocketSetup = function(socket, data, user) {
	console.log("connected to : " + socket.id + ", with email : " + data.email);
	setupClient(socket.id, data.email);
	model['users'].getUserId(data.email, function(objectId) {
		console.log("objectId: " + objectId);
		socket.set('user', JSON.stringify({ "objectId" : objectId, "email" : data.email }), function() {
			socket.emit('setup:completed');
		}); 
	})
}

var onSocketDisconnect = function(socket) {
	unsubscribeAllTopicsToClient(socket.id);
}

var onSocketSubscribeGroupsListener = function(socket, data, user) {
	console.log("onSocketSubscribeGroupsListener")
  	subscribeGroupsListener(socket.id, user.email, function(message) {
		socket.emit('groups:change', message);
	});
}

var onSocketUnsubscribeGroupsListener = function(socket, data, user) {
	console.log("onSocketUnsubscribeGroupsListener")
  	unsubscribeGroupsListener(socket.id, user.email);
}

var onSocketGroupsInsert = function(socket, data) {
	if (data.info == null) {
		// TODO internal error
	}

	groupsInsert(socket.id, data);
}

var onSocketGroupsModify = function(socket, data, user) {
	var group_id = data.group_id;
	var unseen = data.unseen;
	if (!group_id || !unseen) {
		// TODO internal error
	}

	groupsModify(socket, group_id, unseen, user);
}

var onSocketGroupsSearch = function(socket, data, user) {
	console.log("onSocketGroupsSearch")
	if (data.per_page == null || data.page == null) {
		// TODO internal error
	}
	groupsSearch(socket, user.objectId, data);
}

var onSocketSubscribeMessagesListener = function(socket, data, user) {
	if (data.group_id == null) {
		// TODO internal error 
	}

  	subscribeMessagesListener(socket.id, user.email, data.group_id, function(message) {
		socket.emit('messages:change:' + data.group_id, message);
	});
}

var onSocketUnsubscribeMessagesListener = function(socket, data, user) {
	if (data.group_id == null) {
		// TODO internal error 
	}
  	unsubscribeMessagesListener(socket.id, user.email, data.group_id);
}

var onSocketMessagesSearch = function(socket, data, user) {
	console.log("onSocketMessagesSearch")
	if (data.per_page == null || data.page == null || data.group_id == null) {
		// TODO internal error
	}
	messagesSearch(socket, user.objectId, data);
}

var onSocketMessagesUnread = function(socket, data, user) {
	console.log("onSocketMessagesUnread")
	if (data.per_page == null || data.page == null) {
		// TODO internal error
	}
	messagesUnread(socket, user.objectId, data);
}

var groupsTopicName = function(client_id, email) {
	return email + "/" + client_id + "/g";
}

var messagesTopicName = function(client_id, email, group_id) {
	return email + "/" + client_id + "/" + group + "/m";
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

var subscribeGroupsListener = function(client_id, email, callback) {	
	var topic = groupsTopicName(client_id, email);
	var handler = minpubsub.subscribe(topic, function(msg){
		console.log("[" + topic + "] is executing with message " + msg);
		callback(msg);
	});
	registerHandler(email, client_id, topic, handler);
}

var unsubscribeGroupsListener = function(client_id, email) {
	var topic = groupsTopicName(client_id, email);
	var handler = resolveHandler(client_id, email, topic);
	if (handler) {
		minpubsub.unsubscribe(handler);	
	}
};

var groupsInsert = function(client_id, data) {
	// TODO
}

var groupsModify = function(socket, group_id, unseen, user) {
	console.log(user);
	model['groups'].updateGroup(group_id, unseen, user.objectId, function(group) {
		socket.emit('groups:change', { 
			email : user.email, 
			entity : "groups", 
			type : "modified", 
			data : group 
		});
	});
}

var groupsSearch = function(socket, user_id, data) {
	var per_page = data.per_page;
	var page = data.page;

	model['groups'].findByUser(user_id, {
		per_page : per_page, 
		page : page, 
		success : function(data) {
			socket.emit('groups:fetch', { data : data });
		}
	});
}

var subscribeMessagesListener = function(client_id, email, group_id, callback) {	
	var topic = messagesTopicName(client_id, email, group_id);
	var handler = minpubsub.subscribe(topic, function(msg){
		console.log("[" + topic + "] is executing with message " + msg);
		callback(msg);
	});
	registerHandler(email, client_id, topic, handler);
}

var unsubscribeMessagesListener = function(client_id, email, group_id) {
	var topic = messagesTopicName(client_id, email, group_id);
	var handler = resolveHandler(client_id, email, topic);
	if (handler) {
		minpubsub.unsubscribe(handler);
	}
};

var messagesSearch = function(socket, user_id, data) {
	var per_page = data.per_page;
	var page = data.page;
	var group_id = data.group_id;	

	var opts = {
		per_page : per_page, 
		page : page, 
		group_id : group_id, 
		user_id : user_id, 
		success : function(data) {
			console.log(opts);
			console.log(data);
			socket.emit('messages:fetch:' + opts.group_id , { data : data });
		}
	};
	model['messages'].findByGroupId(opts);
}

var messagesUnread = function(socket, user_id, data) {
	var per_page = data.per_page;
	var page = data.page;

	var opts = {
		per_page : per_page, 
		page : page, 
		user_id : user_id, 
		success : function(data) {
			console.log(opts);
			console.log(data);
			socket.emit('messages:unread', { data : data });
		}
	};
	model['messages'].findUnreadByUserId(opts);
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
	onSocketSubscribeGroupsListener : onSocketSubscribeGroupsListener,
	onSocketUnsubscribeGroupsListener : onSocketUnsubscribeGroupsListener,
	onSocketGroupsInsert : onSocketGroupsInsert,
	onSocketGroupsModify : onSocketGroupsModify,
	onSocketGroupsSearch : onSocketGroupsSearch,
	onSocketSubscribeMessagesListener : onSocketSubscribeMessagesListener,
	onSocketUnsubscribeMessagesListener : onSocketUnsubscribeMessagesListener,
	onSocketMessagesSearch : onSocketMessagesSearch,
	onSocketMessagesUnread : onSocketMessagesUnread
};
