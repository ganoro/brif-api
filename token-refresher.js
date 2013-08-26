var queue = require('./queue.js');
var config = require('./config.js');
var Kaiseki = require('kaiseki');
var xml2js = require('xml2js').parseString;
var $ = require('jquery').create();

var parse = new Kaiseki(config.kaiseki_app_id, config.kaiseki_rest_api_key);

var params = {
	where: { email: email },
	count: true,
	limit: 1
};
parse.getObjects('Users', params, function(err, res, body, success) {
	

});







