var port = 443;

var parse_app_id = 'mMS3oCiZOHC15v8OGTidsRgHI0idYut39QKrIhIH';
var parse_javascript_api_key = '93nPWcPsKnnoxQqVxmMHt0PlV1oelkbdI7D20QY8';

var google_config_production = {"auth_uri":"https://accounts.google.com/o/oauth2/auth","client_secret":"7hV6CnQ-etu-QWLHXixoRwjB","token_uri":"https://accounts.google.com/o/oauth2/token","client_email":"808248997275-ou0vtokaht54knr34697a1epd5m0j5rf@developer.gserviceaccount.com","redirect_uris":["http://api.brif.us/auth/signin"],"client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/808248997275-ou0vtokaht54knr34697a1epd5m0j5rf@developer.gserviceaccount.com","client_id":"808248997275-ou0vtokaht54knr34697a1epd5m0j5rf.apps.googleusercontent.com","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","javascript_origins":["http://www.brif.us"]};
var google_config_staging = {"auth_uri":"https://accounts.google.com/o/oauth2/auth","client_secret":"iCesKUB5OyjwnnCaKstAuZx4","token_uri":"https://accounts.google.com/o/oauth2/token","client_email":"808248997275-ol6kol8h23j018iug3d5odi9vhrja9j5@developer.gserviceaccount.com","redirect_uris":["http://api.brif.us/auth/signin"],"client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/808248997275-ol6kol8h23j018iug3d5odi9vhrja9j5@developer.gserviceaccount.com","client_id":"808248997275-ol6kol8h23j018iug3d5odi9vhrja9j5.apps.googleusercontent.com","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","javascript_origins":["http://staging.brif.us"]};
var google_config_ofersarid = {"auth_uri":"https://accounts.google.com/o/oauth2/auth","client_secret":"hCILo9EpsWZzyzaz42TXDTNF","token_uri":"https://accounts.google.com/o/oauth2/token","client_email":"808248997275-jb3m6f7k32ebauk063qu8anqj6br1vk3@developer.gserviceaccount.com","redirect_uris":["http://api.brif.us/auth/signin"],"client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/808248997275-jb3m6f7k32ebauk063qu8anqj6br1vk3@developer.gserviceaccount.com","client_id":"808248997275-jb3m6f7k32ebauk063qu8anqj6br1vk3.apps.googleusercontent.com","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","javascript_origins":["http://brif.ofersarid.c9.io"]};
var google_config_localhost = {"auth_uri":"https://accounts.google.com/o/oauth2/auth","client_secret":"CFDWd5gcdOzxCmsm5uTscTFh","token_uri":"https://accounts.google.com/o/oauth2/token","client_email":"808248997275@developer.gserviceaccount.com","redirect_uris":["http://api.brif.us/auth/signin"],"client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/808248997275@developer.gserviceaccount.com","client_id":"808248997275.apps.googleusercontent.com","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","javascript_origins":["http://localhost"]};
var google_config_ios = {"auth_uri":"https://accounts.google.com/o/oauth2/auth","client_secret":"Ucajgf8BPN4fXajscWXLdZ85","token_uri":"https://accounts.google.com/o/oauth2/token","client_email":"","redirect_uris":["urn:ietf:wg:oauth:2.0:oob","oob"],"client_x509_cert_url":"","client_id":"808248997275-td1l666khkenuda7irdhr27ullu7svps.apps.googleusercontent.com","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs"};

var getStateByClientId = function(client_id) {
	if (google_config_production.client_id == client_id) {
		return "production";
	} 
	if (google_config_staging.client_id == client_id) {
		return "staging";
	} 
	if (google_config_localhost.client_id == client_id) {
		return "localhost";
	} 
	if (google_config_ios.client_id == client_id) {
		return "ios";
	} 
	return "production";
}

module.exports = {
	google_config_production : google_config_production,
	google_config_staging :google_config_staging,
	google_config_ofersarid :google_config_ofersarid,
	google_config_localhost : google_config_localhost,
	google_config_ios : google_config_ios,
	getStateByClientId: getStateByClientId,
	port: port,
	parse_app_id: parse_app_id,
	parse_javascript_api_key: parse_javascript_api_key
};
