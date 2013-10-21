/**
 * Organize all templates here
 */ 
var fs = require('fs');
var _ = require('underscore');

var templates = {};

// retrieve groups xml
fs.readFile('./retrieve_groups.xml', function (err, data) {
  if (err) console.log(err);
  templates['retrieve_groups'] = data;
});

var compile = function(name, parameters) {
	var text = templates[name];
	return _.template(text, parameters);
}

module.exports = {
	compile : compile
}