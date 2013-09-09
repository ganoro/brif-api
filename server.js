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
app.post('/notification/notify'  , routes['notifications'].notify);

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

io.sockets.on('connection', function (socket) {
	console.log("connected to: " + socket.id);

	var route = require('./route.notifications.js');

	socket.on('setup', function(data) { 
		route.onSocketSetup(socket, data);
	});

	socket.on('groups:subscribe', function(data) { 
		route.onSocketSubscribeGroupsListener(socket, data);
	});
		
	socket.on('groups:unsubscribe', function(data) { 
		route.onSocketUnsubscribeGroupsListener(socket, data);
	});

	// socket.on('groups insert', route.onSocketGroupsInsert);
	// socket.on('groups search', route.onSocketGroupsSearch);

	socket.on('messages:subscribe', function(data) { 
		route.onSocketSubscribeMessagesListener(socket, data);
	});
		
	socket.on('messages:unsubscribe', function(data) { 
		route.onSocketUnsubscribeMessagesListener(socket, data);
	});
	// socket.on('messages insert', route.onSocketMessagesInsert);
	// socket.on('messages search', route.onSocketMessagesSearch);

	socket.on('disconnect', function() { 
		route.onSocketDisconnect(socket);
	});
});

console.log('Listening on port ' + config.port);
