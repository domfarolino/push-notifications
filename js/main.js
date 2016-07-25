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

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var AppController = function () {
  function AppController() {
    var _this = this;

    _classCallCheck(this, AppController);

    this.backendURL = 'https://push-notifications-sw.herokuapp.com';

    this.registration = null;
    this.subscription = null;

    this.isSubscribed = false;
    this.supportsPayload = false;

    this.endpoint = '';
    this.deviceToken = '';
    this.pubKey = '';
    this.authSecret = '';

    // Elements
    this.subscribeButton = document.getElementById('subscribe-button');
    this.publicKeyTitle = document.getElementById('publicKeyTitle');
    this.authSecretTitle = document.getElementById('authSecretTitle');
    this.endpointText = document.getElementById('endpoint');
    this.publicKeyText = document.getElementById('publicKeyText');
    this.authSecretText = document.getElementById('authSecretText');
    this.payloadData = document.getElementById('payloadData');

    // Notify all
    this.notifyAllButton = document.getElementById('notify-all-button');
    this.notifyAllMessage = document.getElementById('notify-all-message');
    this.notifyAllIcon = document.getElementById('notify-all-icon-url');

    this.notifyAllButton.addEventListener('click', this.notifyHandler.bind(this));

    this.registerServiceWorker();

    this.subscribeButton.addEventListener('click', function () {
      if (_this.isSubscribed) _this.unsubscribe();else _this.subscribe();
    });
  }

  _createClass(AppController, [{
    key: 'registerServiceWorker',
    value: function registerServiceWorker() {
      var _this2 = this;

      if ('serviceWorker' in navigator) {
        console.log('Service Worker is supported');
        navigator.serviceWorker.register('sw.js').then(function () {
          return navigator.serviceWorker.ready;
        }).then(function (serviceWorkerRegistration) {
          // Set this.registration
          console.log('Setting this.registration = serviceWorkerRegistration');
          _this2.registration = serviceWorkerRegistration;
          _this2.attemptToReviveExistingSubscription();
          console.log('Service Worker is ready :^)', _this2.registration);
        }).catch(function (error) {
          console.log('Service Worker error :^(', error);
        });
      }
    }
  }, {
    key: 'notifyHandler',
    value: function notifyHandler() {
      console.log('notifyAll()');
      if (!this.supportsPayload) {
        this.notifyJustMe();
      } else {
        this.notifyAll();
      }
    }
  }, {
    key: 'notifyAll',
    value: function notifyAll() {
      var url = new URL('https://push-notifications-sw.herokuapp.com/pushAll');
      var params = { text: this.notifyAllMessage.value, icon: this.notifyAllIcon.value };

      Object.keys(params).forEach(function (key) {
        return url.searchParams.append(key, params[key]);
      });

      fetch(url).then(function () {
        console.log('Notifying all that support payload!');
      }).catch(console.log);
    }
  }, {
    key: 'attemptToReviveExistingSubscription',
    value: function attemptToReviveExistingSubscription() {
      var _this3 = this;

      console.log("reviveSubscriptionDetails()");

      this.registration.pushManager.getSubscription().then(function (serviceWorkerSubscription) {
        _this3.subscription = serviceWorkerSubscription;
        if (_this3.subscription) {
          _this3.isSubscribed = true;
          _this3.buildValuesFromSubscription();
        }
        _this3.updateUI();
      });
    }
  }, {
    key: 'buildValuesFromSubscription',
    value: function buildValuesFromSubscription() {
      console.log('buildValuesFromSubscription()');

      if (this.subscription) {
        this.endpoint = this.subscription.endpoint;

        if (this.subscription.getKey) {
          this.supportsPayload = true;

          var rawPubKey = this.subscription.getKey('p256dh');
          var rawAuthSecret = this.subscription.getKey('auth');

          this.pubKey = rawPubKey ? btoa(String.fromCharCode.apply(null, new Uint8Array(rawPubKey))) : null;
          this.authSecret = rawAuthSecret ? btoa(String.fromCharCode.apply(null, new Uint8Array(rawAuthSecret))) : null;
        } else {
          console.log('A true American shame...your browser does not support payload encrypted push notifications');
        }
      }
    }
  }, {
    key: 'updateUI',
    value: function updateUI() {
      console.log("updateUI()");
      if (this.registration) this.subscribeButton.disabled = false;

      if (this.isSubscribed) {
        this.endpointText.innerText = this.endpoint;
        this.subscribeButton.textContent = 'Unsubscribe';
        this.notifyAllButton.classList.remove('no-subscription');
      } else {
        console.log('Not subscribed');
        this.notifyAllButton.classList.add('no-subscription');
        this.endpointText.innerText = '';
        this.subscribeButton.textContent = 'Subscribe';
      }

      if (this.isSubscribed && this.supportsPayload) {
        this.payloadData.classList.remove('no-payload');
        this.publicKeyTitle.classList.remove('no-payload');
        this.authSecretTitle.classList.remove('no-payload');

        this.publicKeyText.innerText = this.pubKey;
        this.authSecretText.innerText = this.authSecret;

        this.notifyAllButton.innerText = 'Notify all subscribers';
      } else {
        this.payloadData.classList.add('no-payload');
        this.publicKeyTitle.classList.add('no-payload');
        this.authSecretTitle.classList.add('no-payload');

        this.publicKeyText.innerText = '';
        this.authSecretText.innerText = '';

        this.notifyAllButton.innerText = 'Notify me';
      }
    }
  }, {
    key: 'subscribe',
    value: function subscribe() {
      var _this4 = this;

      console.log("subscribe()");

      this.registration.pushManager.subscribe({ userVisibleOnly: true }).then(function (serviceWorkerSubscription) {
        _this4.subscription = serviceWorkerSubscription;
        if (_this4.subscription) {
          _this4.isSubscribed = true;
          _this4.buildValuesFromSubscription();
        }

        console.log('Subscribed! Endpoint:', _this4.endpoint);

        if (_this4.supportsPayload) {
          console.log('Public key: ', _this4.pubKey);
          console.log('Private key: ', _this4.authSecret);
          _this4.sendEncryptionInformationToServer();
        }

        // Update UI
        _this4.updateUI();
      });
    }
  }, {
    key: 'sendEncryptionInformationToServer',
    value: function sendEncryptionInformationToServer() {
      console.log("sendEncryptionInformationToServer()");
      var fetchOptions = {
        method: 'POST',
        headers: new Headers({
          'Content-Type': 'application/json'
        }),
        body: JSON.stringify({
          endpoint: this.endpoint,
          pubKey: this.pubKey,
          authSecret: this.authSecret
        })
      };

      fetch(this.backendURL + '/subscription', fetchOptions).then(function (response) {
        if (response.status >= 400 && response.status < 500) {
          console.log('Failed web push response: ', response, response.status);
          throw new Error('Failed to send push message via web push protocol');
        }
      }).catch(console.log);
    }
  }, {
    key: 'notifyJustMe',
    value: function notifyJustMe() {
      console.log("notifyJustMe()");
      var fetchBody = {
        "headers": {
          "Authorization": "key=AIzaSyC_i2HqF5w5_-ArGKSsrJRIDPUCT10bDIQ", "Content-Type": "application/json"
        },
        "body": JSON.stringify({ to: this.endpoint.replace('https://android.googleapis.com/gcm/send/', '') }),
        "endpoint": 'https://android.googleapis.com/gcm/send'
      };

      var fetchOptions = {
        method: 'POST',
        mode: 'no-cors',
        headers: new Headers({
          'Content-Type': 'text/html'
        }),
        body: JSON.stringify(fetchBody)
      };

      fetch('https://simple-push-demo.appspot.com/api/v2/sendpush', fetchOptions).then(function () {
        console.log("SUCCESS");
      }).catch(console.log);
    }
  }, {
    key: 'unsubscribe',
    value: function unsubscribe() {
      var _this5 = this;

      this.subscription.unsubscribe().then(function (event) {
        console.log('Unsubscribed!', event);
        _this5.isSubscribed = false;
        _this5.supportsPayload = false;
        _this5.updateUI();
      }).catch(console.log);
    }
  }]);

  return AppController;
}();