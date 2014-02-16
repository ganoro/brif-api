var config = require('./config.js');
var xoauth2 = require("xoauth2");
var request = require('request');
var xml2js = require('xml2js').parseString;
var $ = require('jquery').create();
var templates = require('./templates.js');

var model = {};
model['messages'] = require('./model.messages.js');

var onSocketContactsCreate = function (socket, data, user) {
	console.log("onSocketContactsCreate");
	if (data.name == null || data.email == null || data.email.length == 0) {
		// TODO internal error
	}
	contactsManage(socket, data, user);
}

var onSocketContactsLatest = function(socket, data, user) {
	console.log("onSocketContactsCreate");
	if (data.contact == null) {
		// TODO internal error
	}

	contactsLatest(data.contact, user.objectId, function(result) {
		var contacts = [];
		var latest = [];
		for (var i = 0; i < result.length; i++) {
			var r = result[i].get('recipients');
			if (contacts.indexOf(r) == -1) {
				contacts.push(r);
				latest.push(result[i].attributes)
			}
		};
		socket.emit('contacts:latest', { data : latest });
	}, function() {
		socket.emit('contacts:latest', { error: arguments })
	});
}

var contactsManage = function(socket, data, user) {
	
	// general purpose callbacks & headers
	var headers = buildHeaders(user);
	var successCallback = function(result) {
		return socket.emit('contacts:create', { data : result });
	};
	var errorCallback = function(error) {
		return socket.emit('contacts:create', { error : error });
	};

	// remove email duplicates
	data.email = removeDuplicates(data.email);

	// conatct managment (one contact details)
	if (data.email.length == 1) {

		// check if contact exists
		contactExists(headers, data.email[0], function(entry) { 
			// contact exists - update its name
			entry["gd:name"] = [ { 'gd:fullName': [ data.name ] } ];
			contactsUpdate([entry], data, headers, successCallback, errorCallback);
		}, function() { 
			// new contact - create it
			contactsCreate(data, headers, successCallback, errorCallback); 
		}, errorCallback);

	// group managment (several contacts as group)
	} else {
		// make sure all contacts exist - get their id.
		getContacts(headers, data.email, function(contacts, possibleGroupIds) {
			// search for an existing group which includes exactly all these contacts
			groupExists(headers, data.email, possibleGroupIds, function(group) {
				// if a group already exists - rename
				groupRename(group, headers, data, successCallback, errorCallback);
			}, function() {
				// else - create a group 
				groupCreate(data, headers, function(group_id) {
					// tag all contacts with this group
					contactsUpdate(addGroupToContacts(group_id, contacts), data, headers, successCallback, errorCallback);
				}, errorCallback);
			}, errorCallback);
		}, errorCallback);
	};
}

var contactsLatest = function(contact, user_id, success, error) {
	model['messages'].findLatest({
		contact : contact, 
		user_id : user_id, 
		limit : 10,
		success : success, 
		error : error 
	})
}

var removeDuplicates = function(emails) {
	return emails.filter(function(elem, pos) {
    	return emails.indexOf(elem) == pos;
	});
}

var buildHeaders = function(user, errorCallback) {
	if (typeof user.access_token === "undefined") {
		return "";
	}
	return { 
 		"Gdata-version" : "3.0", 
		"Content-type" : "application/atom+xml", 
 		"Authorization" : "Bearer " + user.access_token 
 	};
}

var getContacts = function(headers, emails, success, errorCallback) {
	var found = 0;
	var entries = [];	
	var possibleGroupIds = null;

	$.each(emails, function(i, email) {
		contactExists(headers, email, 
			function(entry) {
				var membership = entry["gContact:groupMembershipInfo"];
				if (membership != null) {
					membership = removeSystemGroups(membership);
				  	if (possibleGroupIds == null || membership.length < possibleGroupIds.length) {
						possibleGroupIds = membership;
					}
				}

				entries.push(entry);
				found++;
				if (found == emails.length) {
					success(entries, possibleGroupIds);
				}
			}, function() {
				possibleGroupIds = [];
				var name = email.substring(0,email.indexOf("@"));
				var data = { name : name, email : email }
				contactsCreate(data, headers, function(result) {
					var entry = result['entry'];
					entries.push(entry);
					found++;
					if (found == emails.length) {
						success(entries, possibleGroupIds);
					}
				}, errorCallback) ;
			}, errorCallback);
	});
}

var fetchGroups = function(headers, groups, successCallback, errorCallback) {
	console.log("fetchGroups()");

	var url = 'https://www.google.com/m8/feeds/groups/default/full/batch';
 	var group_ids = [];
 	$.each(groups, function(i, entry) {
		group_ids.push(entry['$']['href'].replace("base", "full"));
 	}) 
	var body = templates.compile('retrieve_groups', { groups : group_ids });
 	var process = {
		emit : function(error, result) {
			if (error != null) {
				return errorCallback(error);
			}
			groups = [];
			if (result["feed"]["entry"]) {
				groups = result['feed']["entry"];
			}
			successCallback(groups);
		},
		parse : function(error, response, body) {
			if (error || response.statusCode != 200) {
				return errorCallback(error);
			}
			xml2js(body, process.emit);
		} 
	}
	request.post(url, { 
		body : body,
		headers : headers
	}, process.parse);
}


var removeSystemGroups = function(membership) {
	var result = [];
	$.each(membership, function(i,v) {
		var href = v['$']['href'];
		if (href.substring(href.lastIndexOf("/")).length > 3) {
			result.push(v);
		}
	});
	return result;
}

var groupExists = function(headers, emails, possibleGroupIds, existsCallback, missingCallback, errorCallback) {
	console.log("groupExists()");
	if (possibleGroupIds == null || possibleGroupIds.length == 0) {
		return missingCallback();
	}

	// list groups
	var identicals = possibleGroupIds.length;
	fetchGroups(headers, possibleGroupIds, function(result) {
		// search for identical group
		$.each(result, function(i, entry) {
			identicalGroups(headers, emails, entry['id'][0], function() {
				existsCallback(entry);
			}, function() {
				identicals--;
				if (identicals == 0 && i == (possibleGroupIds.length - 1)) {
					missingCallback();
				}
			}, errorCallback);
		})
	}, errorCallback);
}

var identicalGroups = function(headers, emails, group_id, foundCallback, notFoundCallback, errorCallback) {
	console.log("identicalGroups()");

	var url = 'https://www.google.com/m8/feeds/contacts/default/full?group=' + group_id;
	var process = {
		emit : function(error, result) {
			if (error != null) {
				return errorCallback(error);
			}
			var groups_emails = [];
			if (result["feed"]["entry"]) {
    			for (var i = result["feed"]["entry"].length - 1; i >= 0; i--) {
    				var entry = result["feed"]["entry"][i];
    				if (entry["gd:email"] && entry["gd:email"].length > 0) {
    					groups_emails.push(entry["gd:email"][0]['$']["address"]);
    				}
    			};
    		} 
    		var identical = $(groups_emails).not(emails).length == 0 && $(emails).not(groups_emails).length == 0;
    		return identical ? foundCallback() : notFoundCallback();
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

var groupRename = function(group, headers, data, successCallback, errorCallback) {
	console.log("groupRename()");

	group["batch:id"] = [ 'update'];
	group["batch:operation"] = [ { '$' : { type : 'update'} }];
	group["title"] = [ data.name ];
	group["content"] = [ data.name ];

	json2xml(group, "entry", function(xml) {
		var url = 'https://www.google.com/m8/feeds/groups/default/full/batch';
		var entries = [ xml ];
		var body = templates.compile('batch', { entries : entries });
		var process = {
			emit : function(error, result) {
				if (error != null) {
					return errorCallback(error);
				}
				var group = result["feed"]["entry"];
				successCallback(group);
			},
			parse : function(e, r, body) {
				if (e) {
					return errorCallback(e);
				}
				xml2js(body, process.emit);
			} 
		}
		request.post(url, { 
			headers : headers,
			body : body
		}, process.parse);
	})
}

var groupCreate = function(data, headers, successCallback, errorCallback) {
	console.log("groupCreate()");
	var url = 'https://www.google.com/m8/feeds/groups/default/full/';
	var body = templates.compile('new_group', { title: data.name, email: data.email.join() });
	var process = {
		emit : function(error, result) {
			if (error != null) {
				return errorCallback(error);
			}
			group_id= result["entry"]["id"][0];
			successCallback(group_id);
		},
		parse : function(e, r, body) {
			if (e) {
				return errorCallback(e);
			}
			xml2js(body, process.emit);
		} 
	}

	request.post(url, { 
		headers : headers,
		body : body
	}, process.parse);
}

var contactExists = function(headers, email, existsCallback, missingCallback, errorCallback) {
	console.log("contactExists()");

	email = email.toLowerCase();

	var url = 'https://www.google.com/m8/feeds/contacts/default/full?q=' + email;
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
    				if (entry["gd:email"] && entry["gd:email"].length > 0 && entry["gd:email"][0]['$']["address"].toLowerCase() == email) {
    					return existsCallback(entry);
    				}
    			};
    		} 
    		return missingCallback();
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

var contactsUpdate = function(entries, data, headers, successCallback, errorCallback) {
	console.log("contactsUpdate()");

	$.each(entries, function(i,entry) {
		entry["batch:id"] = [ 'update'];
		entry["batch:operation"] = [ { '$' : { type : 'update'} }];
	})

	json2xml(entries, "entry", function(xml) {
		var url = "https://www.google.com/m8/feeds/contacts/default/full/batch";
		var body = templates.compile('batch', { entries : [xml] });
		var process = {
			emit : function(error, result) {
				if (error != null) {
					return errorCallback(error);
				}
				successCallback(result);
			},
			parse : function(e, r, body) {
				if (e) {
					return errorCallback(e);
				}
				xml2js(body, process.emit);
			} 
		}
		request.post(url, { 
			headers : headers,
			body : body
		}, process.parse);
	});
}

var contactsCreate = function(data, headers, createdCallback, errorCallback) {
	console.log("contactsCreate()");
	var url = 'https://www.google.com/m8/feeds/contacts/default/full/';
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
	request.post(url, { 
		headers : headers,
		body : body
	}, process.parse);
}

var addGroupToContacts = function (group_id, entries) {
	$.each(entries, function(i, entry) {
		if (!("gContact:groupMembershipInfo" in entry)) {
			entry["gContact:groupMembershipInfo"] = [];
		} 
		entry["gContact:groupMembershipInfo"].push({ '$' : { deleted : 'false', href : group_id } });
	});
	return entries;
}

/**
 *  json2xml - Convert an xml2js JSON object back to XML
 *  @author Derek Anderson
 */
var json2xml = function(json, root, cb){
  var recursion = 0;
  var xml = '';
  var isArray = function(obj) { return obj.constructor == Array; };
  
  var parseAttributes = function(node){
    for(key in node){
      var value = node[key];
      xml += ' ' + key +'=\''+ value +'\'';
    };
    xml += '>';
  };
  
  var parseNode = function(node, parentNode){
    recursion++;
    // Handle Object structures in the JSON properly
    if(!isArray(node)){
      xml += '<'+ parentNode;
      if(typeof node == 'object' && node['$']){
        parseAttributes(node['$']);
      } else {
        xml += '>';
      }
      for(key in node){
        var value = node[key];  
        // text values
        if(typeof value == 'string'){
        	xml += value;
        }
        // is an object
        if(typeof value == 'object' && key != '$'){
          parseNode(node[key], key);
        }
      }
      recursion--;
      xml += '</'+ parentNode +'>';
    }
    
    // Handle array structures in the JSON properly
    if(isArray(node)){
      for(var i=0; i < node.length; i++){
        parseNode(node[i], parentNode);
      }
      recursion--;
    }
    
    if (recursion === 0) { cb(xml); }
  };
  parseNode(json, root); // fire up the parser!
};

// exports public functions
module.exports = {
	onSocketContactsCreate : onSocketContactsCreate,
	onSocketContactsLatest : onSocketContactsLatest
};
