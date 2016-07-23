var express = require('express');
var path    = require('path');
var webPush = require('web-push');
var router  = express.Router();

process.env['GCM_API_KEY'] = 'AIzaSyC_i2HqF5w5_-ArGKSsrJRIDPUCT10bDIQ';
webPush.setGCMAPIKey(process.env.GCM_API_KEY);

var storedPushCredentials = [];

/* GET home page. */
router.get('/', function(request, response, next) {
  response.sendFile(path.join(__dirname, '../', 'index.html'));
});

router.get('/pushAll', function(request, response, next) {
  
  var pushPayload = {
    text: request.query.text || "Static server payload for now",
    icon: request.query.icon || "https://avatars0.githubusercontent.com/u/19820480?v=3&s=200" 
  }
  
  storedPushCredentials.forEach(function(pushCredentials, i) {

    webPush.sendNotification(pushCredentials.endpoint, {
      TTL: 200,
      payload: JSON.stringify(pushPayload),
      userPublicKey: pushCredentials.pubKey,
      userAuth: pushCredentials.authSecret,
    }).then(function() {
      console.log("Push notification sent successfully");
    }).catch(function(error) {
      console.log(error);
    });
  
  }); //end forEach
  
  response.sendStatus(201);
  
});

/* POST subscription data */
router.post('/subscription', function(request, response, next) {
  
  var newPushCredentials = {
    endpoint: request.body.endpoint,
    pubKey: request.body.pubKey,
    authSecret: request.body.authSecret
  };
  
    var found = storedPushCredentials.some(function (element) {
      return element.endpoint === newPushCredentials.endpoint;
    });
    if (!found) {
        storedPushCredentials.push(newPushCredentials);
    }
  
  console.log(storedPushCredentials);
  response.sendStatus(200);
});

module.exports = router;
