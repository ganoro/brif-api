/**
 * Load libraries 
 */ 
var express = require('express');

/**
 * initialize express app
 */ 
var app = express();

/**
 * configuration
 */ 
app.use(express.bodyParser());
app.use(function(err, req, res, next){
  console.error(err.stack);
  res.send(500, 'Something broke!');
});

app.all('*', function(req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "X-Requested-With");
	next();
});

var redirect_www = function(req, res) {
    res.redirect('http://www.brif.us');
}

app.get('/' , redirect_www);
app.listen(80)

console.log('Listening on port ' + config.port);
