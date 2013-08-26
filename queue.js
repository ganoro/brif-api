var aws = require('aws-sdk');
var queue_url = '';

/**
 * aws configuration
 */
var initRefreshQue = function (aws, callback) {
	if (aws == null || callback == null) {
	    throw new Error('brif internal error: aws or callback are missing');
	}
	aws.config.loadFromPath('./config-aws.json');
	var sqs = new aws.SQS();
	sqs.getQueueUrl({ 'QueueName' : 'brif-messages'}, callback);
	return sqs;
}

/**
 * post message to refresh que
 */
exports.queueRefreshTokenMessage = function(objectId) {
	var params = { 'QueueUrl' : queue_url, 'MessageBody' : objectId, 'DelaySeconds' : 20 };
	console.log(params)
	sqs.sendMessage(params, function(err, data) {
		console.log("message registered" + data.MessageId);
	});
}

/**
 * post message to refresh que
 */
exports.listenRefreshTokenMessage = function(callback) {
	sqs.receiveMessage({ 'QueueUrl' : queue_url }, callback);
}

/**
 * aws refresh sqs
 */
var sqs = initRefreshQue(aws, function(err, data) {
	queue_url = data.QueueUrl;
})

