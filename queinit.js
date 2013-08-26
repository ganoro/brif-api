/**
 * aws configuration
 */
exports.initRefreshQue = function (aws, callback) {
	if (aws == null || callback == null) {
	    throw new Error('brif internal error: aws or callback are missing');
	}
	aws.config.loadFromPath('./config-aws.json');
	var sqs = new aws.SQS();
	sqs.getQueueUrl({ 'QueueName' : 'brif-messages'}, callback);
	return sqs;
}





