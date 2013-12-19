var config = require('./config.js');
var xoauth2 = require("xoauth2");
var request = require('request');
var xml2js = require('xml2js').parseString;
var $ = require('jquery').create();
var templates = require('./templates.js');


var onSocketGroupsFetch = function (socket, data, user) {
	console.log("onSocketGroupsFetch");
	if (data.groups == null) {
		// TODO internal error
	}

	groupsFetch(socket, data, user);
}

var onSocketContactsCreate = function (socket, data, user) {
	console.log("onSocketContactsCreate");
	if (data.name == null || data.email == null || data.email.length == 0) {
		// TODO internal error
	}

	contactsManage(socket, data, user);
}

var contactsManage = function(socket, data, user) {
	
	var errorCallback = function(error) {
		return socket.emit('contacts:create', { error : error });
	};

	if (data.email.length == 1) {
		contactExists(user, data.email[0],
			function(entry) { 
				contactsUpdate(entry['$']["gd:etag"], entry["gd:email"], entry["link"], socket, data, user);
			}, 
			function() { 
				contactsCreate(data, user, function(result) {
					socket.emit('contacts:create', { data : result } );
				}); 
			}, errorCallback);
	} else {
		// make sure all contacts exist - get their id.
		getContactsId(user, data.email, 
			function(ids) {
				// search for an existing group with this rid


				// if a group exists - rename

				// else - create a group and tag all contacts with this group
				// groupsCreate(socket, data, user);


			}, errorCallback);
	};
}

var getContactsId = function(user, emails, success, errorCallback) {
	var found = 0;
	var ids = [];

	$.each(emails, function(i, email) {
		contactExists(user, email, 
			function(entry) {
				var id = entry["id"][0];
				found++;
				if (found == emails.length) {
					success(ids);
				}
			}, function() {
				var name = email.substring(0,email.indexOf("@"));
				var data = { name : name, email : email }
				contactsCreate(data, user, function(entry) {
					var id = entry["id"][0];
					found++;
					if (found == emails.length) {
						success(ids);
					}
				}, errorCallback) ;
			}, errorCallback);
	});
}

var groupsFetch = function(socket, data, user) {
	console.log("groupsFetch()");
	var url = 'https://www.google.com/m8/feeds/groups/default/full/batch';
	var headers = { 
		"Gdata-version" : "3.0", 
		"Content-type" : "application/atom+xml", 
		"Authorization" : "Bearer " + user.access_token 
	};
	var body = templates.compile('retrieve_groups', { groups : data.groups });
	var process = {
		socket : socket,
		resolveGroup : function(error, result) {
			if (error != null) {
				return process.socket.emit('groups:fetch', { 
					error : error 
				});
			}
			groups = [];
			if (result["feed"]["entry"]) {
				$.each(result["feed"]["entry"], function( i, v ) {
					var id = v["id"][0];
					var title = v["title"][0]["_"];
					groups.push({ id : id, title: title });
				});			
			}
			process.socket.emit('groups:fetch', { groups : groups } );
		},
		parse : function(e, r, body) {
			if (e) {
				// TODO : internal error
				return console.log(e);
			}
			xml2js(body, process.resolveGroup);
		} 
	}

	request.post(url, { 
		headers : headers,
		body : body
	}, process.parse);
}

var groupsCreate = function(socket, data, user) {
	console.log("groupsCreate()");
	var url = 'https://www.google.com/m8/feeds/groups/default/full/';
	var headers = { 
		"Gdata-version" : "3.0", 
		"Content-type" : "application/atom+xml", 
		"Authorization" : "Bearer " + user.access_token 
	};
	var body = templates.compile('new_group', { title: data.name, email: data.email.join() });
	var process = {
		socket : socket,
		emit : function(error, result) {
			if (error != null) {
				return process.socket.emit('contacts:create', { 
					error : error
				});
			}
			var groups = {};
			groups.id= result["entry"]["id"][0];
			groups.title = result["entry"]["title"][0]['_'];
			process.socket.emit('contacts:create', { groups : groups } );
			var url = 'https://www.google.com/m8/feeds/contacts/default/full/batch';
			var headers = { 
				"Content-type" : "application/atom+xml", 
				"Authorization" : "Bearer " + user.access_token 
			};
			var body = templates.compile('new_contacts', { title: data.name, emails: data.email, group_id : groups.id });
			console.log(body); 
			request.post(url, { 
				headers : headers,
				body : body
			}, function(e,r, body) { console.log (body);  } );
		},
		parse : function(e, r, body) {
			if (e) {
				// TODO : internal error
				return console.log(e);
			}
			xml2js(body, process.emit);
		} 
	}

	request.post(url, { 
		headers : headers,
		body : body
	}, process.parse);
}

var contactExists = function(user, email, existsCallback, missingCallback, errorCallback) {
	console.log("contactExists()");

	var url = 'https://www.google.com/m8/feeds/contacts/default/full?q=' + email;
	var headers = { 
		"Gdata-version" : "3.0", 
		"Authorization" : "Bearer " + user.access_token 
	};

	var process = {
		existsCallback : existsCallback,
		missingCallback : missingCallback,
		errorCallback : errorCallback,
		emit : function(error, result) {
			if (error != null) {
				return errorCallback(error);
			}
			if (result["feed"]["entry"]) {
    			for (var i = result["feed"]["entry"].length - 1; i >= 0; i--) {
    				var entry = result["feed"]["entry"][i];
    				if (entry["gd:email"] && entry["gd:email"].length > 0 && entry["gd:email"][0]['$']["address"] == email) {
    					existsCallback(entry);
    				}
    			};
    		} else {
    			missingCallback();
    		}
		},
		parse : function(error, response, body) {
    		if (error || response.statusCode != 200) {
				return errorCallback(error);
			}
			xml2js(body, process.emit);
		} 
	}

	request.get(url, { 
		headers : headers,
		xml : true
	}, process.parse);
}

var contactsUpdate = function(etag, emails, links, socket, data, user) {
	console.log("contactsUpdate()");

	var id = null;
	for (var i = links.length - 1; i >= 0; i--) {
		if (links[i]['$']["rel"] == "edit") {
			id = links[i]['$']["href"];
		}
	};

	if (!id) {
		console.log("intenral error in contactsUpdate()");
	}
	var headers = { 
		"Gdata-version" : "3.0", 
		"Content-type" : "application/atom+xml", 
		"Authorization" : "Bearer " + user.access_token 
	};
	var url = "https://www.google.com/m8/feeds/contacts/default/full/batch";

	data.emails = pluk("gd:email", emails);
	data.links = pluk("link", links);

	var body = templates.compile('update_contact', { etag: etag, id: id, emails: data.emails, links : data.links, name: data.name, email: data.email});
	var process = {
		socket : socket,
		data : data,
		emit : function(error, result) {
			if (error != null) {
				return process.socket.emit('contacts:create', { 
					error : error 
				}); 
			}
			process.socket.emit('contacts:create', { data : result } );
		},
		parse : function(e, r, body) {
			if (e) {
				// TODO : internal error
				return console.log(e);
			}
			xml2js(body, process.emit);
		} 
	}
	request.post(url, { 
		headers : headers,
		body : body
	}, process.parse);
}

var pluk = function(prefix, elements) {
	var result = '';
	$.each(elements, function(i,list) {
		result += '<' + prefix + ' ';
		$.each(list, function(index,value) {
		    for (var k in value) {
		    	var v = value[k];
		    	result += (k + "='" + v + "' ");
		    }
		});
		result += ' />';
	});
	return result;
}

var contactsCreate = function(data, user, createdCallback, errorCallback) {
	console.log("contactsCreate()");
	var url = 'https://www.google.com/m8/feeds/contacts/default/full/';
	var headers = { 
		"Gdata-version" : "3.0", 
		"Content-type" : "application/atom+xml", 
		"Authorization" : "Bearer " + user.access_token 
	};
	var body = templates.compile('new_contact', { name: data.name, email: data.email});
	var process = {
		emit : function(error, result) {
			if (error != null) {
				console.log("error!!!")
				return errorCallback(error);
			}
			createdCallback(result);
		},
		parse : function(e, r, body) {
			if (e) {
				return errorCallback(e);
			}
			xml2js(body, process.emit);
		} 
	}
	console.log(body);
	request.post(url, { 
		headers : headers,
		body : body
	}, process.parse);
}

// exports public functions
module.exports = {
	onSocketGroupsFetch : onSocketGroupsFetch,
	onSocketContactsCreate : onSocketContactsCreate
};
