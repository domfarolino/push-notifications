'use strict';

class AppController {
  constructor() {
    this.backendURL = 'https://push-notifications-server.glitch.me';

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

    // Notify one
    this.notifyOneButton = document.getElementById('notify-one-button');
    this.notifyOneTitle = document.getElementById('notify-one-title');
    this.notifyOneMessage = document.getElementById('notify-one-message');
    this.notifyOneIcon = document.getElementById('notify-one-icon-url');

    // Set-up <code> wrapper text bindings.
    this.notifyOneTitle.addEventListener('input', e => {
      document.querySelector('#code-title').innerText = e.target.value;
    });
    this.notifyOneMessage.addEventListener('input', e => {
      document.querySelector('#code-text').innerText = e.target.value;
    });
    this.notifyOneIcon.addEventListener('input', e => {
      document.querySelector('#code-icon').innerText = e.target.value;
    });

    this.notifyOneButton.addEventListener('click', this.notifyHandler.bind(this));

    this.registerServiceWorker();

    this.subscribeButton.addEventListener('click', () => {
      if (this.isSubscribed) this.unsubscribe();
      else this.subscribe();
    });
  }

  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      console.log('Service Worker is supported');
      navigator.serviceWorker.register('sw.js').then(() => {
        return navigator.serviceWorker.ready;
      })
      .then(serviceWorkerRegistration => {
        // Set this.registration
        console.log('Setting this.registration = serviceWorkerRegistration');
        this.registration = serviceWorkerRegistration;
        this.attemptToReviveExistingSubscription();
        console.log('Service Worker is ready :^)', this.registration);
      })
      .catch(error => {
        console.log('Service Worker error :^(', error);
      });
    }
  }

  notifyHandler() {
    console.log('notifyHandler()');
    if (!this.supportsPayload) {
      this.notifyJustMe();
    } else {
      this.notifyOne();
    }
  }

  notifyOne() {
    let url = new URL(`${this.backendURL}/pushOne`);
    let params = {
      endpoint: this.endpoint,
      title: this.notifyOneTitle.value,
      text: this.notifyOneMessage.value,
      icon: this.notifyOneIcon.value
    };

    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

    fetch(url)
      .then(() => {
        console.log('Notifying this client!');
      })
      .catch(console.log);
  }

  attemptToReviveExistingSubscription() {
    console.log("reviveSubscriptionDetails()");

    this.registration.pushManager.getSubscription().then(serviceWorkerSubscription => {
      this.subscription = serviceWorkerSubscription;
      if (this.subscription) {
        this.isSubscribed = true;
        this.buildValuesFromSubscription();
      }
      this.updateUI();
    });
  }

  buildValuesFromSubscription() {
    console.log('buildValuesFromSubscription()');

    if (this.subscription) {
      this.endpoint = this.subscription.endpoint;

      if (this.subscription.getKey) {
        this.supportsPayload = true;

        let rawPubKey = this.subscription.getKey('p256dh');
        let rawAuthSecret = this.subscription.getKey('auth');

        this.pubKey = rawPubKey ? btoa(String.fromCharCode.apply(null, new Uint8Array(rawPubKey))) : null;
        this.authSecret = rawAuthSecret ? btoa(String.fromCharCode.apply(null, new Uint8Array(rawAuthSecret))) : null;
      } else {
        console.log('A true American shame...your browser does not support payload encrypted push notifications');
      }
    }
  }

  updateUI() {
    console.log("updateUI()");
    if (this.registration) this.subscribeButton.disabled = false;

    if (this.isSubscribed) {
      this.endpointText.innerText = this.endpoint;
      document.querySelector('#code-endpoint').innerText = this.endpoint;
      this.subscribeButton.textContent = 'Unsubscribe';
      this.notifyOneButton.classList.remove('no-subscription');
    } else {
      console.log('Not subscribed');
      this.notifyOneButton.classList.add('no-subscription');
      this.endpointText.innerText = '';
      document.querySelector('#code-endpoint').innerText = '';
      this.subscribeButton.textContent = 'Subscribe';
    }

    if (this.isSubscribed && this.supportsPayload) {
      this.payloadData.classList.remove('no-payload');
      this.publicKeyTitle.classList.remove('no-payload');
      this.authSecretTitle.classList.remove('no-payload');

      this.publicKeyText.innerText = this.pubKey;
      this.authSecretText.innerText = this.authSecret;

      this.notifyOneButton.innerText = 'Send a push notification';
    } else {
      this.payloadData.classList.add('no-payload');
      this.publicKeyTitle.classList.add('no-payload');
      this.authSecretTitle.classList.add('no-payload');

      this.publicKeyText.innerText = '';
      this.authSecretText.innerText = '';

      this.notifyOneButton.innerText = 'Notify me';
    }
  }

  // Helper.
  urlBase64ToUint8Array(base64String) {
      var padding = '='.repeat((4 - base64String.length % 4) % 4);
      var base64 = (base64String + padding)
          .replace(/\-/g, '+')
          .replace(/_/g, '/');

      var rawData = window.atob(base64);
      var outputArray = new Uint8Array(rawData.length);

      for (var i = 0; i < rawData.length; ++i) {
          outputArray[i] = rawData.charCodeAt(i);
      }
      return outputArray;
  }

  subscribe() {
    console.log("subscribe()");

    const subscriptionOptions = {
      userVisibleOnly: true,
      applicationServerKey: this.urlBase64ToUint8Array('BPitDZ5d0ljZN_gheCdwDyCM71W1AmpiwkriWGrxaYkzamjXx4jW_MkciqU5pYCuJ5qXCafG6ldY6zuOBoXVzSY'),
    };
    this.registration.pushManager.subscribe(subscriptionOptions).then(serviceWorkerSubscription => {
      this.subscription = serviceWorkerSubscription;
      if (this.subscription) {
        this.isSubscribed = true;
        this.buildValuesFromSubscription();
      }

      console.log('Subscribed! Endpoint:', this.endpoint);

      if (this.supportsPayload) {
        console.log('Public key: ', this.pubKey);
        console.log('Private key: ', this.authSecret);
        this.sendEncryptionInformationToServer();
      }

      // Update UI
      this.updateUI();
    });
  }


  sendEncryptionInformationToServer() {
    console.log("sendEncryptionInformationToServer()");
    let fetchOptions = {
      method: 'POST',
      headers: new Headers({
        'Content-Type': 'application/json'
      }),
      body: JSON.stringify({
        endpoint: this.endpoint,
        p256dh: this.pubKey,
        auth: this.authSecret
      })
    };

    fetch(`${this.backendURL}/subscription`, fetchOptions).then(response => {
      if (response.status >= 400 && response.status < 500) {
        console.log('Failed web push response: ', response, response.status);
        throw new Error('Failed to send push message via web push protocol');
      }
    })
    .catch(console.error);
  }


  notifyJustMe() {
    console.log("notifyJustMe()");
    let fetchBody = {
      "headers":{
          "Authorization":"key=AIzaSyC_i2HqF5w5_-ArGKSsrJRIDPUCT10bDIQ","Content-Type":"application/json"
      },
      "body": JSON.stringify({to: this.endpoint.replace('https://android.googleapis.com/gcm/send/', '')}),
      "endpoint": 'https://android.googleapis.com/gcm/send',
    };

    let fetchOptions = {
      method: 'POST',
      mode:'no-cors',
      headers: new Headers({
        'Content-Type': 'text/html',
      }),
      body: JSON.stringify(fetchBody)
    };

    fetch('https://simple-push-demo.appspot.com/api/v2/sendpush', fetchOptions).then(() => {
      console.log("SUCCESS");
    }).catch(console.log);
  }

  unsubscribe() {
    this.subscription.unsubscribe().then(event => {
      console.log('Unsubscribed!', event);
      this.isSubscribed = false;
      this.supportsPayload = false;
      this.updateUI();
    }).catch(console.log);
  }
}

const appController = new AppController();
