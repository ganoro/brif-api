/**
 * Load libraries 
 */ 
var express = require('express');
var config = require('./config.js');
var request = require('request');
var xml2js = require('xml2js').parseString;
var $ = require('jquery').create();

/**
 * Load routes
 */ 
var routes = {}; 
routes['auth'] = require('./route.auth.js');
routes['notifications'] = require('./route.notifications.js');
routes['ice'] = require('./route.ice.js');

/**
 * initialize express app
 */ 
var app = express();

/**
 * configuration
 */ 
app.use(express.bodyParser());

app.all('*', function(req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "X-Requested-With");
	next();
 });

/**
 * Setup routes
 */ 
app.post('/auth/signin-plus'     , routes['auth'].signin_plus);
app.post('/auth/mobile-signin'   , routes['auth'].mobile_signin);
app.post('/auth/refresh-token'   , routes['auth'].refresh_token);
app.post('/notifications/trigger', routes['notifications'].notify); 
app.post('/meeting/joinRoom'	 , routes['ice'].postJoinRoom); 


// TBD Upload, very generic
app.post('/attachments/upload', function(req, res) {
	console.log('/attachments/upload');
	var attachment = null;
	if (req.files != null && req.files.attachment != null && toString.call(req.files.attachment) !== "[object Array]") {
		var a = req.files.attachment;
		var attachment = {
			key: a.path.substring(5),
			fileName : a.name,
			filePath : a.path,
			contentType : a.type
		}
	} else {
		console.log(req);
	}
	res.send({ data : attachment });
}); 
app.post('/attachments/remove', function(req, res) {
	console.log(req);
	res.send("{ key : '43b45a86547465e3f4' }"); // TODO send before execute?
}); 

/**
 * error handling
 */ 
app.use(function(err, req, res, next){
  console.error(err.stack);
  res.send(500, 'Something broke!');
});

/**
 * socket io
 */ 
var io = require('socket.io').listen(app.listen(config.port));
// io.set('log level', 1); // reduce logging

io.sockets.on('connection', function (socket) {	
	// proxy, enables socket and user details as parameters as well as refresh token 
	var proxy = function(callback) {
		return function(data) {
			socket.get('user', function(err, result) {
				var user = JSON.parse(result);
				if (user == null || parseInt(user.timeout) > Date.now()) {
					callback(socket, data, user);
				} else {
					var d = { email : user.email, post_event : function(updated_user) {
						callback(socket, data, updated_user);
					} };
					notifications.onSocketSetup(socket, d, user);
				}
			});
		}
	}

	var notifications = require('./route.notifications.js');
	var mailer = require('./route.mailer.js');
	var crm = require('./route.crm.js');
	var tasks = require('./route.tasks.js');
	var ice = require('./route.ice.js');	
	var settings = require('./route.settings.js');

	// setup
	socket.on('setup', proxy(notifications.onSocketSetup));
	socket.on('disconnect', proxy(notifications.onSocketDisconnect));

	// messages
	socket.on('messages:fetch', proxy(notifications.onSocketMessagesFetch));
	socket.on('messages:fetch_timeline', proxy(notifications.onSocketMessagesFetchTimeline));
	socket.on('messages:fetch_thread', proxy(notifications.onSocketMessagesFetchThread));
	socket.on('messages:fetch_previous_threads', proxy(notifications.onSocketMessagesFetchPreviousThreads));
	socket.on('messages:fetch_google_msg_id', proxy(notifications.messagesFetchByGoogleMsgId));
	socket.on('messages:near', proxy(notifications.onSocketMessagesNear));

	// channels
	socket.on('channels:subscribe', proxy(notifications.onSocketSubscribeChannelsListener));
	socket.on('channels:unsubscribe', proxy(notifications.onSocketUnsubscribeChannelsListener));
	socket.on('channels:send', proxy(notifications.onSocketChannelsSend));

	// mailer
	socket.on('messages:send', proxy(mailer.onSocketMessagesSend));
	socket.on('messages:markas', proxy(mailer.onSocketMessagesMarkAs));
	socket.on('messages:search', proxy(mailer.onSocketMessagesSearch));
	socket.on('messages:fetch_unread_imap', proxy(mailer.onSocketMessagesUnread));
	socket.on('messages:next_of', proxy(mailer.onSocketMessagesNextOf));

	// groups & contacts
	socket.on('contacts:create', proxy(crm.onSocketContactsCreate));
	socket.on('contacts:latest', proxy(crm.onSocketContactsLatest));

	// task repositories
	socket.on('repositories:list', proxy(tasks.onSocketTasksList));
	socket.on('repositories:create', proxy(tasks.onSocketTasksCreate));
	socket.on('repositories:remove', proxy(tasks.onSocketTasksRemove));
	socket.on('repositories:permissions', proxy(tasks.onSocketTasksPermissions));

	// task repositories
	socket.on('ice:room', proxy(ice.onSocketCreateRoom));

	// settings
	socket.on('settings:set', proxy(settings.onSocketSettingsSet));
	socket.on('settings:get', proxy(settings.onSocketSettingsGet));
	socket.on('settings:clear', proxy(settings.onSocketSettingsClear));

	socket.emit('setup:ready');
});

console.log('Listening on port ' + config.port);
