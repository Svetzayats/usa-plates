const CACHE_NAME = "usa-plates-cache-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",
  "./assets/icons/icon-192.svg",
  "./assets/icons/icon-512.svg",
  "./assets/icons/maskable.svg"
];

self.addEventListener("install", function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) { return cache.addAll(ASSETS); })
  );
});

self.addEventListener("activate", function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.filter(function(k){ return k !== CACHE_NAME; }).map(function(k){ return caches.delete(k); }));
    })
  );
});

self.addEventListener("fetch", function(event) {
  const req = event.request;
  if (req.method !== "GET") return;
  event.respondWith(
    caches.match(req).then(function(cached) {
      const fetchPromise = fetch(req).then(function(networkRes) {
        const copy = networkRes.clone();
        caches.open(CACHE_NAME).then(function(cache){ cache.put(req, copy); });
        return networkRes;
      }).catch(function(){ return cached; });
      return cached || fetchPromise;
    })
  );
});

