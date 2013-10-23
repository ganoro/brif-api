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
app.get ('/auth/signin'          , routes['auth'].signin);
app.post('/auth/mobile-signin'   , routes['auth'].mobile_signin);
app.post('/auth/refresh-token'   , routes['auth'].refresh_token);
app.post('/notifications/trigger', routes['notifications'].notify); 

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
io.set('log level', 1); // reduce logging

io.sockets.on('connection', function (socket) {
	console.log("connected to: " + socket.id);
	
	// proxy, enables socket and user details as parameters
	var proxy = function(callback) {
		return function(data) {
			socket.get('user', function(err, result) {
				var user = JSON.parse(result);
				callback(socket, data, user);
			});
		}
	}

	var notifications = require('./route.notifications.js');
	var mailer = require('./route.mailer.js');

	// setup
	socket.on('setup', proxy(notifications.onSocketSetup));
	socket.on('disconnect', proxy(notifications.onSocketDisconnect));

	// messages
	socket.on('messages:subscribe', proxy(notifications.onSocketSubscribeMessagesListener));
	socket.on('messages:unsubscribe', proxy(notifications.onSocketUnsubscribeMessagesListener));
	socket.on('messages:fetch', proxy(notifications.onSocketMessagesFetch));
	socket.on('messages:fetch_all', proxy(notifications.onSocketMessagesFetchAll));
	socket.on('messages:fetch_thread', proxy(notifications.onSocketMessagesFetchThread));

	// mailer
	socket.on('messages:send', proxy(mailer.onSocketMessagesSend));
	socket.on('messages:markas', proxy(mailer.onSocketMessagesMarkAs));

	// channels
	socket.on('channels:subscribe', proxy(notifications.onSocketSubscribeChannelsListener));
	socket.on('channels:unsubscribe', proxy(notifications.onSocketUnsubscribeChannelsListener));
	socket.on('channels:send', proxy(notifications.onSocketChannelsSend));

	// groups
	socket.on('groups:fetch', proxy(notifications.onSocketGroupsFetch));
	socket.on('groups:create', proxy(notifications.onSocketGroupsCreate));

	socket.emit('setup:ready');
});

console.log('Listening on port ' + config.port);
