/* eslint-disable no-restricted-globals */

// Bump version on every deploy to invalidate stale caches
var CACHE_NAME = "tutor-app-2026-10-27";

var PRECACHE_URLS = ["/", "/manifest.json", "/logo192.png", "/logo512.png"];

// Install — cache app shell
self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(PRECACHE_URLS);
    })
  );
  self.skipWaiting();
});

// Activate — clean up old caches
self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (cacheNames) {
      return Promise.all(
        cacheNames
          .filter(function (name) {
            return name !== CACHE_NAME;
          })
          .map(function (name) {
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim();
});

// Fetch — network-first with cache fallback for both navigation and static assets
self.addEventListener("fetch", function (event) {
  // Skip non-GET requests
  if (event.request.method !== "GET") return;

  // Skip API requests — never cache them
  if (event.request.url.includes("/api/")) return;

  // Navigation requests (HTML pages) — network-first
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then(function (response) {
          var responseClone = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(function () {
          return caches.match(event.request).then(function (cachedResponse) {
            return cachedResponse || caches.match("/");
          });
        })
    );
    return;
  }

  // Static assets (JS, CSS, images) — network-first with cache fallback
  event.respondWith(
    fetch(event.request)
      .then(function (response) {
        if (response.ok) {
          var responseClone = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(function () {
        return caches.match(event.request);
      })
  );
});

var REMINDER_VIBRATION = [200, 100, 200];
var CALL_VIBRATION = [300, 200, 300, 200, 300];

// Every notification of one call carries the tag `call-<callId>`, so each replaces the previous.
var toNotificationOptions = function (payload) {
  var data = payload.data || {};
  var options = {
    body: payload.body,
    tag: payload.tag,
    data: data,
    icon: "/logo192.png",
    badge: "/logo192.png",
  };
  if (data.type === "incoming_call") {
    options.requireInteraction = true;
    options.renotify = true;
    options.vibrate = CALL_VIBRATION;
  } else if (data.type === "missed_call" || data.type === "call_closed") {
    options.renotify = false;
  } else {
    options.requireInteraction = true;
    options.vibrate = REMINDER_VIBRATION;
  }
  return options;
};

var closeTagged = function (tag) {
  return self.registration.getNotifications({ tag: tag }).then(function (notifications) {
    notifications.forEach(function (notification) {
      notification.close();
    });
  });
};

// The device that answered gets no closing push, so a page that already took or declined this
// call closes an incoming notification that arrived late.
var tellAppWindows = function (message) {
  return self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (list) {
    list.forEach(function (client) {
      client.postMessage(message);
    });
  });
};

// Push notification handler. Every push shows a notification: iOS drops a subscription whose
// push shows none. A call answered or declined elsewhere shows a neutral one and closes it at once.
self.addEventListener("push", function (event) {
  if (!event.data) return;

  try {
    var payload = event.data.json();
    var data = payload.data || {};
    var shown = self.registration.showNotification(payload.title, toNotificationOptions(payload));
    if (data.type === "call_closed") {
      shown = shown.then(function () {
        return closeTagged(payload.tag);
      });
    } else if (data.type === "incoming_call") {
      shown = shown.then(function () {
        return tellAppWindows({ type: "call_notification_shown", callId: data.callId });
      });
    }
    event.waitUntil(shown);
  } catch (error) {
    console.error("Push event error:", error);
  }
});

var findAppWindow = function (clientList) {
  for (var i = 0; i < clientList.length; i++) {
    if ("focus" in clientList[i]) return clientList[i];
  }
  return null;
};

// Notification click handler. An incoming call opens in a running app without reloading it (the
// page asks the server about the call itself); anything else focuses the app and navigates.
self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  var data = event.notification.data || {};
  var url = data.url || "/lessons";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
      var client = findAppWindow(clientList);
      if (client && data.type === "incoming_call") {
        return client.focus().then(function (focused) {
          (focused || client).postMessage({
            type: "call_notification_opened",
            callId: data.callId,
          });
        });
      }
      if (client) {
        return client.focus().then(function (focused) {
          if (focused && "navigate" in focused) {
            return focused.navigate(url);
          }
        });
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});
