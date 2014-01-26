/**
 * Load libraries 
 */ 
var express = require("express"),
    app     = express(),
    port    = 80;

app.get("/", function(req, res) {
    res.redirect('http://www.brif.us');
});

app.listen(port);

console.log('Listening on port ' + port);
