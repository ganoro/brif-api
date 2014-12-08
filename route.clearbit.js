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
		socket.emit('clearbit:person', $.parseJSON(body) )
	});	
}

var onSocketCompanyDetails = function (socket, data, user) {
	console.log("onSocketCompanyDetails");
	// curl 'https:/company.clearbit.co/v1/companies/domain/uber.com' -u 4f1a1b34110a67ded40a4667bd679d23:
	var domain = data.email.substr(data.email.indexOf("@") + 1);
	var url = "https://company.clearbit.co/v1/companies/domain/" + domain;
	request.get(url, { 
		'auth': {
			'user': '4f1a1b34110a67ded40a4667bd679d23:'
		}		
	}, function(error, result, body) {
		body = $.parseJSON(body);
		body.email = data.email; // make sure to return the email as well
		socket.emit('clearbit:company', body);
	});	
}

// exports public functions
module.exports = {
	onSocketPersonDetails : onSocketPersonDetails,
	onSocketCompanyDetails : onSocketCompanyDetails
};
