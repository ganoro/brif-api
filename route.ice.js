var config = require('./config.js');
var $ = require('jquery').create();
var request = require('request');


var onSocketCreateRoom = function (socket, data, user) {
	console.log("onSocketCreateRoom");

  	var form =  {
		ident: "roybrif",
		secret: "e8231a53-e1b7-406e-81fa-367d46da6778",
		domain: data.domain,
		application: "default",
		room: data.room,
		secure: 1
	};
	request({
		method: 'POST', 
		uri: 'https://api.xirsys.com/addRoom',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		form : form
	}, function(e, r, body) {
		if (e) {
			return socket.emit('ice:room', { error : e })
		}
		var data = JSON.parse(body);
		if (data.s == 201 || data.s == 409) {
			request({
				method: 'POST', 
				uri: 'https://api.xirsys.com/getIceServers',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				form : form
			}, function(e, r, body) {
				var data = JSON.parse(body);
				console.log("data", data);
				socket.emit('ice:room', { data : data.d })
			});
		}
	});
}

// exports public functions
module.exports = {
	onSocketCreateRoom : onSocketCreateRoom
};
