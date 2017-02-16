self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', event => {
  console.log('Push message', event);
  console.log(event.data);

  let notificationTitle = 'Dom\'s Push Notifications';
  let notificationText = 'You\'ve recieved a notification';
  let notificationIcon = 'images/notify.png';

  if (event.data) {
    try {
      let payload = event.data.json();
      notificationText = payload.text;
      notificationIcon = payload.icon;
    } catch (error) {
      notificationText = event.data.text();
      notificationIcon = 'https://unsplash.it/200/200?random';
    }
  }

  const notificationOptions = {
    body: notificationText,
    icon: notificationIcon,
    tag: 'notify-sw',
    data: {
      url: 'https://domfarolino.com'
    }
  };

  event.waitUntil(
    self.registration.showNotification(notificationTitle, notificationOptions)
  );
});

/**
 * Event listener mainly lifted from google code labs
 */
self.addEventListener('notificationclick', event => {
  console.log('Notification click: tag', event.notification.tag);
  // Android doesn't close the notification when you click it
  // See http://crbug.com/463146
  event.notification.close();
  let url = 'https://domfarolino.com';
  // Check if there's already a tab open with this URL.
  // If yes: focus on the tab.
  // If no: open a tab with the URL.
  event.waitUntil(
    clients.matchAll({
      type: 'window'
    })
    .then(function(windowClients) {
      console.log('WindowClients', windowClients);
      for (let i = 0; i < windowClients.length; i++) {
        let client = windowClients[i];
        console.log('WindowClient', client);
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
