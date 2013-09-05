var config = require('./config.js');

/**
 * Initalize Parse.com object
 */
var parse = require('parse').Parse;
parse.initialize(config.parse_app_id, config.parse_javascript_api_key);

exports.parse = parse;

