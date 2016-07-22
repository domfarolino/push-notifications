var express = require('express');
var path    = require('path');
var webPush = require('web-push');
var router  = express.Router();

process.env['GCM_API_KEY'] = 'AIzaSyC_i2HqF5w5_-ArGKSsrJRIDPUCT10bDIQ';
webPush.setGCMAPIKey(process.env.GCM_API_KEY);

/* GET home page. */
router.get('/', function(request, response, next) {
  response.sendFile(path.join(__dirname, '../', 'index.html'));
});

/* POST subscription data */
router.post('/subscription', function(request, response, next) {
  console.log(request.body);

  console.log("Received data:");
  console.log(request.body.endpoint);
  console.log(request.body.pubKey);
  console.log(request.body.authSecret);

  console.log("Attempting to use web-push");
  
  var pushPayload = {
    text: "New Message from Ian Moore",
    icon: "https://onlinemarketingsoda.files.wordpress.com/2015/09/google-changes-new-logo-rebranding-2015-icon-doodle-square1.png" 
  }
  
  webPush.sendNotification(request.body.endpoint, {
    TTL: 200,
    payload: JSON.stringify(pushPayload),
    userPublicKey: request.body.pubKey,
    userAuth: request.body.authSecret,
  }).then(function() {
    console.log("Push notification sent successfully");
    response.sendStatus(201);
  }).catch(function(error) {
    console.log(error);
    response.sendStatus(error.statusCode);
  });

});

module.exports = router;
