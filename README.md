# push-notifications

[![MIT license](http://img.shields.io/badge/license-MIT-brightgreen.svg)](http://opensource.org/licenses/MIT)
[![Dependency Status](https://david-dm.org/domfarolino/push-notifications.svg)](https://david-dm.org/domfarolino/push-notifications)
[![devDependency Status](https://david-dm.org/domfarolino/push-notifications/dev-status.svg)](https://david-dm.org/domfarolino/push-notifications#info=devDependencies)

This application demonstrates the [web-push-libs/web-push](https://github.com/web-push-libs/web-push) Node.JS library which facilitates sending web push notifications with encrypted payloads via Nodejs server.

# Demo
Demo the live application [here](https://domfarolino.com/push-notifications)

# Getting started

Running the client side app:

```sh
git clone git@github.com:domfarolino/push-notifications.git
npm install -g gulp
npm install
gulp
```

To run the server locally:

 - Run `npm start`
 - In `src/js/main.js` change any occurrences of the remote API (`https://push-notifications-sw.herokuapp.com`) to `http://localhost:5000` and unregister the old service worker.
