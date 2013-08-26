var config = require('./config.js');
var Kaiseki = require('kaiseki');
var xml2js = require('xml2js').parseString;
var $ = require('jquery').create();
var aws = require('aws-sdk');

/**
 * aws configuration
 */
aws.config.loadFromPath('./config-aws.json');
var refresh_token_queue = '';
var sqs = new AWS.SQS();
sqs.getQueueUrl({ QueueName : ''}, function(err, data) {
	if (err != null) {
		process.exit(1);
	} else {
		refresh_token_queue = data.QueueUrl;
		sqs.receiveMessage({ 'QueueUrl' : refresh_token_queue }, function(err, data) {
			console.log(data);
		});
	}
});
