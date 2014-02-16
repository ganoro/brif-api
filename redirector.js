/**
 * Load libraries 
 */ 
var express = require("express"),
    app     = express(),
    port    = 80;

app.all('*', function(req, res, next) {
    res.redirect('http://www.brif.us' + req.path);
 });

app.listen(port);

console.log('Listening on port ' + port);
