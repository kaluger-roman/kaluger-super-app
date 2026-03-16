/* eslint-disable no-restricted-globals */

// Bump version on every deploy to invalidate stale caches
var CACHE_NAME = "tutor-app-2026-03-16";

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

// Push notification handler
self.addEventListener("push", function (event) {
  if (!event.data) return;

  try {
    var payload = event.data.json();
    var title = payload.title;
    var body = payload.body;
    var tag = payload.tag;
    var data = payload.data;

    var options = {
      body: body,
      tag: tag,
      data: data,
      icon: "/logo192.png",
      badge: "/logo192.png",
      vibrate: [200, 100, 200],
      requireInteraction: true,
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (error) {
    console.error("Push event error:", error);
  }
});

// Notification click handler — navigate to /lessons
self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  var url = (event.notification.data && event.notification.data.url) || "/lessons";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
      // Focus existing window if found
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url.includes(url) && "focus" in client) {
          return client.focus();
        }
      }
      // Open new window if no existing window found
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});
