/**
 * Organize all templates here
 */ 
var fs = require('fs');
var _ = require('underscore');

var templates = {};

// retrieve groups xml
fs.readFile('./templates/retrieve_groups.xml', function (err, data) {
  if (err) throw err;
  templates['retrieve_groups'] = data.toString('utf8');;
});

var compile = function(name, parameters) {
	var text = templates[name];
    console.log(text);
	return _.template(text, parameters);
}

module.exports = {
	compile : compile
}