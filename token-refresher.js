var queue = require('./queue.js');
var config = require('./config.js');
var Kaiseki = require('kaiseki');
var xml2js = require('xml2js').parseString;
var $ = require('jquery').create();

queue.listenRefreshTokenMessage(function(err, data) {
	console.log(data);
});


