/*
*
*  Push Notifications codelab
*  Copyright 2015 Google Inc. All rights reserved.
*
*  Licensed under the Apache License, Version 2.0 (the "License");
*  you may not use this file except in compliance with the License.
*  You may obtain a copy of the License at
*
*      https://www.apache.org/licenses/LICENSE-2.0
*
*  Unless required by applicable law or agreed to in writing, software
*  distributed under the License is distributed on an "AS IS" BASIS,
*  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
*  See the License for the specific language governing permissions and
*  limitations under the License
*
*/

'use strict';

var reg;
var sub;
var endpoint = '';
var deviceToken = '';
var pubKey, authSecret;
var supportsPayload = false;
var isSubscribed = false;

// Elements
var subscribeButton = document.getElementById('subscribe-button');
var publicKeyTitle = document.getElementById('publicKeyTitle');
var authSecretTitle = document.getElementById('authSecretTitle');
var endpointText = document.getElementById('endpoint');
var publicKeyText = document.getElementById('publicKeyText');
var authSecretText = document.getElementById('authSecretText');
var payloadData = document.getElementById('payloadData');

// Notify all
var notifyAllButton = document.getElementById('notify-all-button');
var notifyAllMessage = document.getElementById('notify-all-message');
var notifyAllIcon = document.getElementById('notify-all-icon-url');

notifyAllButton.addEventListener('click', notifyAll);

if ('serviceWorker' in navigator) {
  console.log('Service Worker is supported');
  navigator.serviceWorker.register('sw.js').then(function () {
    return navigator.serviceWorker.ready;
  }).then(function (serviceWorkerRegistration) {
    reg = serviceWorkerRegistration;
    reviveSubscriptionDetails();
    subscribeButton.disabled = false;
    console.log('Service Worker is ready :^)', reg);
  }).catch(function (error) {
    console.log('Service Worker Error :^(', error);
  });
}

function reviveSubscriptionDetails() {
  console.log("reviveSubscriptionDetails()");
  reg.pushManager.getSubscription().then(function (subscription) {
    console.log(JSON.stringify(subscription));
    sub = subscription;
    if (subscription) {
      isSubscribed = true;
      buildValuesFromSubscription();
    }
    updateUI();
  });
}

function buildValuesFromSubscription() {
  // This method assumes isSubscribed = true

  console.log('buildValuesFromSubscription()');
  endpoint = sub.endpoint;

  if (sub && sub.getKey) {
    supportsPayload = true;
    var rawPubKey = sub.getKey('p256dh');
    var rawAuthSecret = sub.getKey('auth');

    // Set pubKey and authSecret
    pubKey = rawPubKey ? btoa(String.fromCharCode.apply(null, new Uint8Array(rawPubKey))) : null;
    authSecret = rawAuthSecret ? btoa(String.fromCharCode.apply(null, new Uint8Array(rawAuthSecret))) : null;
  } else {
    console.log("Browser does not support payload encrypted push notifications");
  }
}

function subscribe() {
  console.log("subscribe()");
  reg.pushManager.subscribe({ userVisibleOnly: true }).then(function (subscription) {
    sub = subscription;
    if (subscription) {
      isSubscribed = true;
      buildValuesFromSubscription();
    }

    console.log('Subscribed! Endpoint:', endpoint);
    if (supportsPayload) {
      console.log('Public key: ', pubKey);
      console.log('Private key: ', authSecret);
    }

    if (supportsPayload) {
      initiatePushNotificationWithPayload();
    } else {
      initiatePushNotificationWithoutPayload();
    }

    // Update UI
    updateUI();
  });
}

function notifyAll() {
  var url = new URL('https://push-notifications-sw.herokuapp.com/pushAll'),
      params = { text: notifyAllMessage.value, icon: notifyAllIcon.value };

  Object.keys(params).forEach(function (key) {
    return url.searchParams.append(key, params[key]);
  });
  fetch(url).then(function () {
    console.log("Notifying all!");
  }).catch(function (error) {
    console.log(error);
  });
}

function updateUI() {
  console.log("updateUI()");
  if (isSubscribed) {
    endpointText.innerText = sub.endpoint;
    subscribeButton.textContent = 'Unsubscribe';
  } else {
    endpointText.innerText = '';
    subscribeButton.textContent = 'Subscribe';
  }

  if (isSubscribed && supportsPayload) {
    payloadData.classList.remove('no-payload');
    publicKeyTitle.classList.remove('no-payload');
    authSecretTitle.classList.remove('no-payload');

    publicKeyText.innerText = pubKey;
    authSecretText.innerText = authSecret;
  } else {
    payloadData.classList.add('no-payload');
    publicKeyTitle.classList.add('no-payload');
    authSecretTitle.classList.add('no-payload');

    publicKeyText.innerText = '';
    authSecretText.innerText = '';
  }
}

function initiatePushNotificationWithPayload() {
  var fetchOptions = {
    method: 'POST',
    headers: new Headers({
      'Content-Type': 'application/json'
    }),
    body: JSON.stringify({
      endpoint: endpoint,
      pubKey: pubKey,
      authSecret: authSecret
    })
  };

  fetch('https://push-notifications-sw.herokuapp.com/subscription', fetchOptions).then(function (response) {
    if (response.status >= 400 && response.status < 500) {
      console.log('Failed web push response: ', response, response.status);
      throw new Error('Failed to send push message via web push protocol');
    }
  }).catch(function (err) {
    console.log('Ooops Unable to Send a Push');
  });
}

function initiatePushNotificationWithoutPayload() {
  var fetchBody = {
    "headers": {
      "Authorization": "key=AIzaSyC_i2HqF5w5_-ArGKSsrJRIDPUCT10bDIQ", "Content-Type": "application/json"
    },
    "body": JSON.stringify({ to: endpoint.replace('https://android.googleapis.com/gcm/send/', '') }),
    "endpoint": 'https://android.googleapis.com/gcm/send'
  };

  var fetchOptions = {
    method: 'POST',
    headers: new Headers({
      'Content-Type': 'text/html'
    }),
    body: JSON.stringify(fetchBody)
  };

  fetch('https://simple-push-demo.appspot.com/api/v2/sendpush', fetchOptions).then(function () {
    console.log("SUCCESS");
  }).catch(function (error) {
    console.log(error);
  });
}

subscribeButton.addEventListener('click', function () {
  if (isSubscribed) {
    unsubscribe();
  } else {
    subscribe();
  }
});

function unsubscribe() {
  sub.unsubscribe().then(function (event) {
    subscribeButton.textContent = 'Subscribe';
    console.log('Unsubscribed!', event);
    isSubscribed = false;
    // Update UI
    updateUI();
  }).catch(function (error) {
    console.log('Error unsubscribing', error);
    subscribeButton.textContent = 'Subscribe';
  });
}