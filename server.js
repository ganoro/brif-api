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
	
	// proxy, enables socket as parameter
	var proxy = function(callback) {
		return function(data) {
			callback(socket, data);
		}
	}

	var route = require('./route.notifications.js');

	// setup
	socket.on('setup', proxy(route.onSocketSetup));
	socket.on('disconnect', proxy(route.onSocketDisconnect));

	// groups
	socket.on('groups:subscribe', proxy(route.onSocketSubscribeGroupsListener));
	socket.on('groups:unsubscribe', proxy(route.onSocketUnsubscribeGroupsListener));
	socket.on('groups:insert', proxy(route.onSocketGroupsInsert));
	socket.on('groups:fetch', proxy(route.onSocketGroupsSearch));

	// messages
	socket.on('messages:subscribe', proxy(route.onSocketSubscribeMessagesListener));
	socket.on('messages:unsubscribe', proxy(route.onSocketUnsubscribeMessagesListener));
	socket.on('messages:insert', proxy(route.onSocketMessagesInsert));
	socket.on('messages:fetch', proxy(route.onSocketMessagesSearch));

});

console.log('Listening on port ' + config.port);
