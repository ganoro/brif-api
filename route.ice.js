var config = require('./config.js');
var $ = require('jquery').create();
var request = require('request');

// socket based
var onSocketCreateRoom = function (socket, data, user) {
	console.log("onSocketCreateRoom()");

	joinRoom(data, function(result) {
		return socket.emit('ice:room', result);
	}, function(e) {
		return socket.emit('ice:room', e);
	});
}

// rest based
var postJoinRoom = function(req, res){
	console.log("onSocketCreateRoom()");

	var data = req.body; 
	joinRoom(data, function(result) {
		return res.send(JSON.stringify(result)); 
	}, function(e) {
		res.status(400).send(JSON.stringify(e));	
		return;
	});
};

var joinRoom = function(data, success, failure) {
	console.log("joinRoom()");

	if (!data || data.domain == null || data.room == null) {
		return failure({ error : "Illegal argument call, data is: " + data });
	}

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
			return failure({ error : e }); 
		}
		var result = JSON.parse(body);
		if (result.s == 201 || result.s == 409) {
			request({
				method: 'POST', 
				uri: 'https://api.xirsys.com/getIceServers',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				form : form
			}, function(e, r, body) {
				var result = JSON.parse(body);
				console.log("result - ", data.domain, data.room, result.d);
				success({ data : result.d });
			});
		}
	});
}

// exports public functions
module.exports = {
	onSocketCreateRoom : onSocketCreateRoom,
	postJoinRoom : postJoinRoom
};
