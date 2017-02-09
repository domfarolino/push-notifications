const express = require('express');
const path    = require('path');
const webPush = require('web-push');
const router  = express.Router();

const firebaseAPIKey = process.env.FIREBASE_API_KEY;
webPush.setGCMAPIKey(firebaseAPIKey);

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
  response.json(storedPushCredentials);
});

router.get('/clearCredentials', function(request, response, next) {
  storedPushCredentials = [];
  response.json(storedPushCredentials);
});

router.get('/pushAll', function(request, response, next) {

  const pushPayload = {
    text: request.query.text || "Static server notification payload...",
    icon: request.query.icon || "https://unsplash.it/200?random"
  }

  console.log(storedPushCredentials);
  storedPushCredentials.forEach(function(pushCredentials, i) {

    webPush.sendNotification(pushCredentials, JSON.stringify(pushPayload))
    .then(function() {
      console.log("Push notification sent successfully");
    })
    .catch(function(error) {
      console.log(error);
    });

  }); //end forEach

  response.sendStatus(201);
});

/* POST subscription data */
router.post('/subscription', function(request, response, next) {

  const newPushCredentials = {
    endpoint: request.body.endpoint,
    keys: {
      p256dh: request.body.p256dh,
      auth: request.body.auth
    }
  };

  const found = storedPushCredentials.some(function (element) {
    return element.endpoint === newPushCredentials.endpoint;
  });

  if (!found) {
    console.log("Pushing credentials to array");
    storedPushCredentials.push(newPushCredentials);
  }

  response.sendStatus(200);
});

module.exports = router;
