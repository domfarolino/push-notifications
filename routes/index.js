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
// Setting `strictQuery` to false to enable the Mongoose 7 behavior. See
// https://mongoosejs.com/docs/migrating_to_7.html#strictquery. In this mode,
// Mongoose will *not* filter out query items that don't appear in the database,
// meaning you can use queries to match items in that database with query
// criteria that don't exist in the schema at all. This project does not rely on
// this behavior because we *always* query with criteria that only exists in the
// scheme. But we set this behavior to enable the Mongoose 7 behavior early, to
// ensure we don't have problems before upgrading.
mongoose.set('strictQuery', false);

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
  if (allowedOrigins.includes(origin)) {
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

router.get('/credentials', async (request, response, next) => {
  if (request.query.key == process.env.API_KEY) {
    const allPushCredentials = await PushCredentials.find();
    response.json(allPushCredentials);
  } else {
    response.status(403).send('Unauthenticated');
  }
});

router.get('/pushAll', async (request, response, next) => {
  const pushPayload = {
    title: request.query.title || "Dom's Push Notifications",
    text: request.query.text || "Static server notification payload...",
    icon: request.query.icon || "https://unsplash.it/200?random"
  }

  let allPushCredentials = await PushCredentials.find();

  /**
   * Map mongoose object that looks like
   * {_id: 0, auth: a, p256dh: b, endpoint: c} to
   * {keys: {auth: a, p256dh: b}, endpoint: c}
   */
  allPushCredentials = allPushCredentials.map(x => ({keys: {auth: x.auth, p256dh: x.p256dh}, endpoint: x.endpoint}));

  allPushCredentials.forEach(pushCredentials => {

    webPush.sendNotification(pushCredentials, JSON.stringify(pushPayload))
      .catch(err => {
        // Credentials are no longer valid, push notification cannot be sent.
        if (err.statusCode == '410') {
          // Remove invalid credentials from database.
          console.log(`Received 410 status code, removing ${pushCredentials.endpoint} from the database`);
          PushCredentials.remove({endpoint: pushCredentials.endpoint}, console.error);
        } else {
          // A different issue happened!
          console.log("Error sending notifications:");
          console.log(err);
        }
      });

  }); // end forEach()

  response.sendStatus(201);
});

router.get('/pushOne', async (request, response, next) => {
  const endpoint = request.query.endpoint;
  if (!endpoint) {
    response.status(400).send("Must provide an endpoint to notify");
  }

  const pushPayload = {
    title: request.query.title || "Dom's Push Notifications",
    text: request.query.text || "Static server notification payload...",
    icon: request.query.icon || "https://unsplash.it/200?random"
  };

  await sendSinglePushHelper(endpoint, pushPayload);
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

router.get('/pushOneForNewVisitor', async (request, response, next) => {
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

  await sendSinglePushHelper(endpoint, pushPayload);
  response.sendStatus(201);
});

// Helper used by different endpoints to send a single push notification to
// `endpoint`, with an arbitrary payload `pushPayload`.
async function sendSinglePushHelper(endpoint, pushPayload) {
  let pushCredentials = await PushCredentials.findOne({endpoint});
  if (!pushCredentials) {
    console.error(`Could not find push credentials associated with ${endpoint}`);
    return;
  }

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
      // Credentials are no longer valid, push notification cannot be sent.
      if (err.statusCode == '410') {
        // Remove invalid credentials from database.
        PushCredentials.remove({endpoint: pushCredentials.endpoint}, console.error);
      } else {
        // A different issue happened!
        console.log("Error sending notifications:");
        console.log(err);
      }
    });
}

/* POST subscription data */
router.post('/subscription', async (request, response, next) => {
  const client = await PushCredentials.find({endpoint: request.body.endpoint});
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

    try {
      await newClient.save();
      response.sendStatus(201);
    } catch (e) {
      return response.status(500).send(e);
    }
  }
});

module.exports = router;
