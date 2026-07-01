// Self-unregistering Service Worker
// Designed to clean up any cached assets and unregister itself from the user's browser.

self.addEventListener('install', (event) => {
  console.log('Uninstall SW: Installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Uninstall SW: Activating and unregistering...');
  event.waitUntil(
    self.registration.unregister()
      .then(() => self.clients.matchAll())
      .then((clients) => {
        console.log('Uninstall SW: Unregistered, reloading clients...');
        clients.forEach((client) => {
          if (client.url && 'navigate' in client) {
            client.navigate(client.url);
          }
        });
      })
  );
});
