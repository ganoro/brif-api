var aws = require('aws-sdk');
var refresh_token_queue = '';

/**
 * aws refresh sqs
 */
var sqs = initRefreshQue(aws, function(err, data) {
	refresh_token_queue = data.QueueUrl;
})

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
exports.refreshToken = function(sqs, objectId) {
	var params = { 'QueueUrl' : refresh_token_queue, 'MessageBody' : objectId, 'DelaySeconds' : 20 };
	console.log(params)
	sqs.sendMessage(params, function(err, data) {
		console.log("message registered" + data.MessageId);
	});
}






