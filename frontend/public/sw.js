self.addEventListener('install', function(event) {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', function(event) {
  if (!event.data) {
    console.log('Push event received with no data.');
    return;
  }
  
  let data = {};
  try {
    data = event.data.json();
  } catch (e) {
    data = { title: 'تنبيه طوارئ', body: event.data.text() };
  }

  const title = data.title || 'طلب استغاثة جديد!';
  const options = {
    body: data.body || 'هناك حالة طوارئ تتطلب تدخلك فوراً.',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: data.tag || 'emergency-alert',
    requireInteraction: true,
    vibrate: [500, 110, 500, 110, 450, 110, 200, 110, 170, 40, 450, 110, 200, 110, 170, 40, 350],
    sound: '/alarm.wav',
    data: {
      url: data.url || '/dashboard',
      incidentId: data.incidentId
    }
  };

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      // Send message to open tabs to play audio alarm immediately
      for (const client of clients) {
        client.postMessage({
          type: data.type || 'EMERGENCY_PUSH',
          incidentId: data.incidentId,
          assignedVolunteer: data.assignedVolunteer,
          assignedVolunteerPhone: data.assignedVolunteerPhone,
          title: title,
          body: options.body
        });
      }
      
      // Show notification
      return self.registration.showNotification(title, options);
    })
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  const targetUrl = event.notification.data ? event.notification.data.url : '/dashboard';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.postMessage({
            type: 'PLAY_ALARM',
            force: true,
            url: targetUrl
          });
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        const urlToOpen = new URL(targetUrl, self.location.origin);
        urlToOpen.searchParams.set('playAlarm', 'true');
        return self.clients.openWindow(urlToOpen.toString());
      }
    })
  );
});
