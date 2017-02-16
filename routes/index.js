const express = require('express');
const router  = express.Router();
const path    = require('path');
const webPush = require('web-push');
const mongoose = require('mongoose');

// web-push Firebase setup
const firebaseAPIKey = process.env.FIREBASE_API_KEY;
webPush.setGCMAPIKey(firebaseAPIKey);

// All da mongo{ose} Jazz
const MONGO_URL = process.env.MONGO_URL;
mongoose.connect(MONGO_URL);

mongoose.connection.on('error', console.error.bind(console, 'connection error:'));
mongoose.connection.once('open', _ => {console.log('Connected to mongoose!')});

const pushCredentialSchema = mongoose.Schema({
  endpoint: {
    type: String,
    required: true
  },
  p256dh: {
    type: String,
    required: true
  },
  auth: {
    type: String,
    required: true
  }
});

const PushCredentials = mongoose.model('PushCredentials', pushCredentialSchema);

/**
 * Cors header stuff
 */

const allowedOrigins = ['http://localhost:3000', 'https://domfarolino.com/push-notifications', 'https://domfarolino.github.io', 'https://domfarolino.com'];

router.use(function(request, response, next) {
  const origin = request.headers.origin;
  if (allowedOrigins.indexOf(origin) > -1) {
       response.setHeader('Access-Control-Allow-Origin', origin);
  }
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type,X-Requested-With');
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,HEAD,DELETE,OPTIONS');
  response.setHeader('Access-Control-Allow-Credentials', true);
  next();
});

/**
 * Endpoints
 */

router.get('/credentials', function(request, response, next) {
  if (request.query.key == process.env.API_KEY) {
    PushCredentials.find((err, allPushCredentials) => {
      response.json(allPushCredentials);
    });
  } else {
    response.status(403).send('Unauthenticated');
  }
});

router.get('/pushAll', function(request, response, next) {
  const pushPayload = {
    text: request.query.text || "Static server notification payload...",
    icon: request.query.icon || "https://unsplash.it/200?random"
  }

  PushCredentials.find((err, allPushCredentials) => {

    /**
     * Map mongoose object that looks like
     * {_id: 0, auth: a, p256dh: b, endpoint: c} to
     * {keys: {auth: a, p256dh: b}, endpoint: c}
     */
    allPushCredentials = allPushCredentials.map(x => ({keys: {auth: x.auth, p256dh: x.p256dh}, endpoint: x.endpoint}));

    allPushCredentials.forEach(pushCredentials => {

      webPush.sendNotification(pushCredentials, JSON.stringify(pushPayload))
        .catch(err => {
          if (err.statusCode == '410') { // Credentials are no longer valid, push noficiation cannot be sent
            // Remove invalid credentials from database
            PushCredentials.remove({endpoint: pushCredentials.endpoint}, console.error);
          }
        });

    }); // end forEach()

  }) // end PushCredentials.find()

  response.sendStatus(201);
});

/* POST subscription data */
router.post('/subscription', function(request, response, next) {

  PushCredentials.find({endpoint: request.body.endpoint}, (err, client) => {

    console.log(client);

    if (!client.length) {
      const newPushCredentials = {
        endpoint: request.body.endpoint,
        p256dh: request.body.p256dh,
        auth: request.body.auth
      };

      console.log(newPushCredentials);

      const newClient = new PushCredentials(newPushCredentials);

      newClient.save((error, savedClient) => {
        if (error) {
          return response.status(500).send(error);
        }

        response.sendStatus(201);
      });
    }

  }); // end PushCredentials.find()
});

module.exports = router;
