/**
 * Organize all templates here
 */ 
var fs = require('fs');
var _ = require('underscore');

var templates = {};

var load = function(name, filename) {
	console.log("* loading template " + name);
	// retrieve groups xml
	fs.readFile('./templates/' + filename, function (err, data) {
	  if (err) throw err;
	  templates[name] = data.toString('utf8');;
	});
}

var compile = function(name, parameters) {
	var text = templates[name];
	return _.template(text, parameters);
}

load('retrieve_groups', 'retrieve_groups.xml');
load('new_group', 'new_group.xml');
load('new_contact', 'new_contact.xml');
load('update_contact', 'update_contact.xml');
load('new_contacts', 'new_contacts.xml');

module.exports = {
	compile : compile
}
