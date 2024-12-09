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

// Mongoose setup.
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

    // TODO: Deduplicate this with the same block of code in
    // `sendSinglePushHelper()`.
    webPush.sendNotification(pushCredentials, JSON.stringify(pushPayload))
      .catch(async err => {
        console.warn(`Push received an error. Status code: ${err.statusCode}`);
        console.warn(err);

        if (err.statusCode == '410') {
          // Credentials are no longer valid (maybe the user revoked push
          // permissions with their provider). Delete the expired or invalid
          // credentials from the database.
          try {
            await PushCredentials.deleteOne({endpoint: pushCredentials.endpoint});
          } catch(e) {
            console.error(`Failed to delete credentials for ${endpoint}. Error: ${e}`);
          }
        } else {
          // A different issue happened!
          console.error('Unexpected error sending push notification');
          console.error(err);
        }
      });

  }); // end forEach()

  response.sendStatus(201);
});

router.get('/pushOne', async (request, response, next) => {
  const endpoint = request.query.endpoint;
  if (!endpoint) {
    const error = "Must provide an endpoint to notify";
    console.error(error);
    response.status(400).send(error);
    return;
  }

  const pushPayload = {
    title: request.query.title || "Dom's Push Notifications",
    text: request.query.text || "Static server notification payload...",
    icon: request.query.icon || "https://unsplash.it/200?random"
  };

  await sendSinglePushHelper(endpoint, pushPayload);
  response.sendStatus(201);
});

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
      console.error(e);
      return response.status(500).send(e);
    }
  }
});

/**
 * Generic push helpers
 *
 * All of this below is not *strictly* related to the push notifications
 * project, but is a set of helpers used for other projects that rely on this
 * backend.
 */
const visitSchema = mongoose.Schema({
  country: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true
  },
  region: {
    type: String,
    required: true
  },
  isp: {
    type: String,
    required: true
  },
  ip: {
    type: String,
    required: true
  },
  referrer: {
    type: String
  },
  fullUrl: {
    type: String
  },
  date: {
    type: String,
    required: true
  }
});

const Visits = mongoose.model('Visits', visitSchema);

router.get('/visits', async (request, response, next) => {
  const count = await Visits.countDocuments();

  let limit = 50;
  if (request.query.all) {
    limit = count;
  }

  const allVisits = await Visits.find().skip(count - limit);
  response.json(allVisits);
});

router.get('/deleteVisit', async (request, response, next) => {
  const result = await Visits.deleteOne({_id: request.query.id});
  response.json(result);
});

// This is a helper analytics endpoint. It expects a single query parameter `ip`
// and reaches a third-party backend to extract data from the IP and send it
// back to the client in a specific format (see documentation below, just above
// the actual API call that this handler makes).
//
// The client is expected to append any other arbitrary data it wishes to this,
// and do its own processing on it. Then the client is expected to take all of
// the data and send it to `/pushOneForNewVisitor`, which actually sends a push
// notification to a specific endpoint.
router.get('/getGeoData', async (request, response, next) => {
  const ip = request.query.ip;
  if (!ip) {
    const error = "Must provide an IP address of client";
    console.error(error);
    response.status(400).send(error);
    return;
  }
  console.log(ip);

  try {
    // Note that the format of the JSON data returned from `ip-api.com` exactly
    // matches the format that `/pushOneForNewVisitor` expects, which is
    // important.
    //
    // Enable either this block...
    const geoData = await fetch(`http://ip-api.com/json/${ip}?fields=537`);
    let json = await geoData.json();
    json.ip = ip;

    // Note that the format of the JSON data returned from `ipapi.co` needs to
    // be formatted in a way that's consistent wtih what `/pushOneForNewVisitor`
    // expects. That's what the `json = {...}` block below does.
    //
    // ...or this block:
    // const geoData = await fetch(`https://ipapi.co/${ip}/json`);
    // let json = await geoData.json();
    // console.log(json);
    // json = {
    //   "country": json["country_name"],
    //   "city": json["city"],
    //   "regionName": json["region"],
    //   "isp": json["org"],
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

// TODO(domfarolino): Right now this is just a copy of `/pushOne`. Make this
// save the link click entry to a database of link clicks.
router.get('/pushOneForLinkClick', async (request, response, next) => {
  const endpoint = request.query.endpoint;
  if (!endpoint) {
    const error = "Must provide an endpoint to notify";
    console.error(error);
    response.status(400).send(error);
    return;
  }

  const pushPayload = {
    title: "Link click",
    text: request.query.text || "Missing link body",
    icon: request.query.icon || "https://unsplash.it/200?random"
  };

  await sendSinglePushHelper(endpoint, pushPayload);
  response.sendStatus(201);
});

// This is the main endpoint used by arbitrary sites that want to push
// notifications to an endpoint that it knows. All it must do is specify the
// following query parameters:
//  - endpoint
//  - text
//
// Given the current, *single* use-case of this method at the moment, the `text`
// query parameter processing is hard-coded to expect JSON in the following shape:
// {
//   country:    /*foo*/,
//   city:       /*foo*/,
//   regionName: /*foo*/,
//   isp:        /*foo*/,
//   ip:         /*foo*/,
//   referrer:   /*foo*/,
//   fullUrl:    /*foo*/,
// }
//
// If any of the above fields are missing, they will simply appear as
// `undefined` in the final push notification.
router.get('/pushOneForNewVisitor', async (request, response, next) => {
  const endpoint = request.query.endpoint;
  if (!endpoint) {
    const error = "Must provide an endpoint to notify";
    console.error(error);
    response.status(400).send(error);
    return;
  }

  const json = JSON.parse(request.query.text);
  const text =
        `Country: ${json.country}, City: ${json.city}, Region: ${json.regionName}, ISP: ${json.isp}, IP: ${json.ip}, Referrer: ${json.referrer}, URL: ${json.fullUrl}`;

  const pushPayload = {
    title: "New Visitor",
    // A JSON-stringified body of text describing the client.
    text,
    icon: "https://avatars.githubusercontent.com/u/9669289",
  };

  // First, save the new visit into the visit database.
  const newVisit = new Visits({
    country: json.country,
    city: json.city,
    region: json.regionName,
    isp: json.isp,
    ip: json.ip,
    referrer: json.referrer,
    fullUrl: json.fullUrl,
    date: new Date().toISOString(),
  });

  try {
    await newVisit.save();
    console.log('New visit saved in database');
  } catch (e) {
    console.error(e);
    return response.status(500).send(e);
  }

  // Second, send the push notification with the full payload to the actual
  // device.
  await sendSinglePushHelper(endpoint, pushPayload);
  response.sendStatus(201);
});

// Helper used by different endpoints to send a single push notification to
// `endpoint`, with an arbitrary payload `pushPayload`.
async function sendSinglePushHelper(endpoint, pushPayload) {
  let pushCredentials = await PushCredentials.findOne({endpoint});
  if (!pushCredentials) {
    const error = `Could not find push credentials associated with ${endpoint}`;
    console.error(error);
    response.status(400).send(error);
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
    .catch(async err => {
      console.warn(`Push received an error. Status code: ${err.statusCode}`);
      console.warn(err);

      if (err.statusCode == '410') {
        // Credentials are no longer valid (maybe the user revoked push
        // permissions with their provider). Delete the expired or invalid
        // credentials from the database.
        try {
          await PushCredentials.deleteOne({endpoint: pushCredentials.endpoint});
        } catch(e) {
          console.error(`Failed to delete credentials for ${endpoint}. Error: ${e}`);
        }
      } else {
        // A different issue happened!
        console.error('Unexpected error sending push notification');
        console.error(err);
      }
    });
}


module.exports = router;
