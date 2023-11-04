const express = require('express');
const router  = express.Router();
const webPush = require('web-push');
const mongoose = require('mongoose');
const fetch = require('node-fetch');

webPush.setVapidDetails(
  'mailto:domfarolino@gmail.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY,
);

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
  },
  date: {
    type: String,
  }
});

const PushCredentials = mongoose.model('PushCredentials', pushCredentialSchema);

/**
 * Cors header stuff
 */

const allowedOrigins = [
  'http://localhost:8000',
  'https://domfarolino.github.io',
  'https://domfarolino.com',
];

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
    title: request.query.title || "Dom's Push Notifications",
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
          } else {
            // A different issue happened!
            console.log("Error sending notifications:");
            console.log(err);
          }
        });

    }); // end forEach()

  }) // end PushCredentials.find()

  response.sendStatus(201);
});

router.get('/pushOne', function(request, response, next) {
  const endpoint = request.query.endpoint;
  if (!endpoint) {
    response.status(400).send("Must provide an endpoint to notify");
  }

  const pushPayload = {
    title: request.query.title || "Dom's Push Notifications",
    text: request.query.text || "Static server notification payload...",
    icon: request.query.icon || "https://unsplash.it/200?random"
  };

  sendSinglePushHelper(endpoint, pushPayload);
  response.sendStatus(201);
});

router.get('/getGeoData', async (request, response, next) => {
  const ip = request.query.ip;
  if (!ip) {
    response.status(400).send("Must provide an IP address of client");
  }
  console.log(ip);

  try {
    // Enable either this block.
    const geoData = await fetch(`http://ip-api.com/json/${ip}?fields=537`);
    let json = await geoData.json();
    json.ip = ip;

    // ...or this block.
    // const geoData = await fetch(`https://ipapi.co/${ip}/json`);
    // let json = await geoData.json();
    // console.log(json);
    // json = {
    //   "country": json["country_name"],
    //   "region": json["region"],
    //   "city": json["city"],
    //   "zip": json["postal"],
    //   "org": json["org"],
    //   "ip": ip,
    // };
    console.log(json);
    response.json(json);
  } catch(e) {
    console.warn(e);
    console.warn(e.toString());
    response.status(400).send('Something went wrong');
  }
});

router.get('/pushOneForNewVisitor', function(request, response, next) {
  const endpoint = request.query.endpoint;
  if (!endpoint) {
    response.status(400).send("Must provide an endpoint to notify");
  }

  const pushPayload = {
    title: "New Visitor",
    // A JSON-stringified body of text describing the client.
    text: request.query.text,
    icon: "https://avatars.githubusercontent.com/u/9669289",
  };

  sendSinglePushHelper(endpoint, pushPayload);
  response.sendStatus(201);
});

// Helper used by different endpoints to send a single push notification to
// `endpoint`, with an arbitrary payload `pushPayload`.
function sendSinglePushHelper(endpoint, pushPayload) {
  PushCredentials.findOne({endpoint}, (err, pushCredentials) => {
    /**
     * Map mongoose object that looks like:
     *   {_id: 0, auth: a, p256dh: b, endpoint: c}
     * ... to an object that looks like, that the web push library understands.
     *   {keys: {auth: a, p256dh: b}, endpoint: c}
     */
    pushCredentials = [pushCredentials];
    pushCredentials = pushCredentials.map(x => ({keys: {auth: x.auth, p256dh: x.p256dh}, endpoint: x.endpoint}))[0];

      webPush.sendNotification(pushCredentials, JSON.stringify(pushPayload))
        .catch(err => {
          if (err.statusCode == '410') { // Credentials are no longer valid, push noficiation cannot be sent
            // Remove invalid credentials from database
            PushCredentials.remove({endpoint: pushCredentials.endpoint}, console.error);
          } else {
            // A different issue happened!
            console.log("Error sending notifications:");
            console.log(err);
          }
        });

  }) // end PushCredentials.findOne()
}

/* POST subscription data */
router.post('/subscription', function(request, response, next) {

  PushCredentials.find({endpoint: request.body.endpoint}, (err, client) => {

    console.log(client);

    if (!client.length) {
      const newPushCredentials = {
        endpoint: request.body.endpoint,
        p256dh: request.body.p256dh,
        auth: request.body.auth,
        date: new Date().toISOString(),
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
