var config = require('./config.js');
var parse = require('parse').Parse;

parse.initialize(config.parse_app_id, config.parse_javascript_api_key);
var Users = parse.Object.extend("Users");










