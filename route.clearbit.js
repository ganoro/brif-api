var config = require('./config.js');
var $ = require('jquery').create();
var request = require('request');

var onSocketPersonDetails = function (socket, data, user) {
	console.log("onSocketPersonDetails");
	// curl 'https://person-stream.clearbit.co/v1/people/email/ganoro@gmail.com' -u 4f1a1b34110a67ded40a4667bd679d23:
	var url = "https://person-stream.clearbit.co/v1/people/email/" + data.email;
	request.get(url, { 
		'auth': {
			'user': '4f1a1b34110a67ded40a4667bd679d23:'
		}		
	}, function(error, result, body) {
		body = $.parseJSON(body);
		body = _.extend(body,{email:data.email});
		socket.emit('clearbit:person', body );
	});	
}

var onSocketCompanyDetails = function (socket, data, user) {
	console.log("onSocketCompanyDetails");
	// curl 'https:/company.clearbit.co/v1/companies/domain/uber.com' -u 4f1a1b34110a67ded40a4667bd679d23:
	var url = "https://company.clearbit.co/v1/companies/domain/" + data.domain;
	request.get(url, { 
		'auth': {
			'user': '4f1a1b34110a67ded40a4667bd679d23:'
		}		
	}, function(error, result, body) {
		socket.emit('clearbit:company', $.parseJSON(body))
	});	
}

// exports public functions
module.exports = {
	onSocketPersonDetails : onSocketPersonDetails,
	onSocketCompanyDetails : onSocketCompanyDetails
};
