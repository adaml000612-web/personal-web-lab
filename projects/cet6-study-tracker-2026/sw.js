const CACHE_PREFIX = "cet6-tracker-";
const CACHE_NAME = `${CACHE_PREFIX}v1-20260828`;

const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./plan-data.js",
  "./manifest.webmanifest",
  "./icons/app-icon.svg",
  "./icons/app-icon-192.png",
  "./icons/app-icon-512.png",
  "./icons/apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter(
              (cacheName) =>
                cacheName.startsWith(CACHE_PREFIX) && cacheName !== CACHE_NAME
            )
            .map((cacheName) => caches.delete(cacheName))
        )
      )
      .then(() => self.clients.claim())
  );
});

function isProjectRequest(request) {
  if (request.method !== "GET") {
    return false;
  }

  const requestUrl = new URL(request.url);
  const scopeUrl = new URL(self.registration.scope);

  return (
    requestUrl.origin === self.location.origin &&
    requestUrl.href.startsWith(scopeUrl.href)
  );
}

async function cacheResponse(request, response) {
  if (response && response.ok && response.type === "basic") {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request) {
  try {
    return await cacheResponse(request, await fetch(request));
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const requestUrl = new URL(request.url);
    const scopeUrl = new URL(self.registration.scope);
    const relativePath = requestUrl.pathname.slice(scopeUrl.pathname.length);
    const hasFileExtension = /\.[a-z0-9]+$/i.test(relativePath);

    if (request.mode === "navigate" || !hasFileExtension) {
      const appShell = await caches.match(new URL("./index.html", scopeUrl));
      if (appShell) {
        return appShell;
      }
    }

    throw error;
  }
}

async function staleWhileRevalidate(request, event) {
  const cachedResponse = await caches.match(request);
  const networkResponse = fetch(request).then((response) =>
    cacheResponse(request, response)
  );

  if (cachedResponse) {
    event.waitUntil(networkResponse.catch(() => undefined));
    return cachedResponse;
  }

  return networkResponse;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (!isProjectRequest(request)) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request, event));
});
