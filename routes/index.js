var express = require('express');
var path    = require('path');
var webPush = require('web-push');
var router  = express.Router();

process.env['GCM_API_KEY'] = 'AIzaSyC_i2HqF5w5_-ArGKSsrJRIDPUCT10bDIQ';
webPush.setGCMAPIKey(process.env.GCM_API_KEY);

//////////////////

const allowedOrigins = ['http://localhost:3000', 'https://domfarolino.com/push-notifications', 'https://domfarolino.github.io', 'https://domfarolino.com'];

router.use(function(request, response, next) {
  var origin = request.headers.origin;
  if (allowedOrigins.indexOf(origin) > -1) {
       response.setHeader('Access-Control-Allow-Origin', origin);
  }
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type,X-Requested-With');
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,HEAD,DELETE,OPTIONS');
  response.setHeader('Access-Control-Allow-Credentials', true);
  next();
});

//////////////////

var storedPushCredentials = [];

/* TODO: REMOVE */
router.get('/credentials', function(request, response, next) {
  response.json(JSON.stringify(storedPushCredentials));
});

router.get('/pushAll', function(request, response, next) {
  
  var pushPayload = {
    text: request.query.text || "Static server payload for now",
    icon: request.query.icon || "https://avatars0.githubusercontent.com/u/19820480?v=3&s=200" 
  }
  
  console.log(storedPushCredentials);
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

  console.log(request.endpoint);
  
  var found = storedPushCredentials.some(function (element) {
    return element.endpoint === newPushCredentials.endpoint;
  });
  if (!found) {
    console.log("pushing");
    storedPushCredentials.push(newPushCredentials);
  }
  
  response.sendStatus(200);
});

module.exports = router;
