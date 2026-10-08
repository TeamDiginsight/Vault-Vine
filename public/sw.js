// Vault & Vine Service Worker
// Provides offline functionality and app caching

const CACHE_VERSION = 'vault-vine-v1';
const RUNTIME_CACHE = 'vault-vine-runtime';

// Core files to cache on install
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/assets/app.js',
  '/assets/stocks.js',
  '/assets/styles.css',
  '/assets/config.js',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.116.0/dist/umd/supabase.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
];

// Install event - cache core assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      console.log('[SW] Caching core assets');
      return cache.addAll(CORE_ASSETS).catch((err) => {
        console.log('[SW] Some assets failed to cache:', err);
        // Don't fail install if some assets fail
        return cache.addAll(
          CORE_ASSETS.filter(url => !url.includes('http'))
        );
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_VERSION && cacheName !== RUNTIME_CACHE) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip external APIs (Finnhub, Twelve Data, etc.)
  if (url.hostname.includes('finnhub.io') ||
      url.hostname.includes('twelvedata.com') ||
      url.hostname.includes('supabase.co')) {
    event.respondWith(fetch(request));
    return;
  }

  // Network first strategy for API calls
  if (url.pathname.includes('/api/') || url.pathname.includes('/auth/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          // Clone and cache successful responses
          const responseClone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
    return;
  }

  // Cache first strategy for static assets
  event.respondWith(
    caches.match(request).then((response) => {
      if (response) {
        return response;
      }
      return fetch(request).then((response) => {
        // Cache successful static asset responses
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }
        const responseClone = response.clone();
        caches.open(RUNTIME_CACHE).then((cache) => {
          cache.put(request, responseClone);
        });
        return response;
      }).catch(() => {
        // Return offline page if available
        return caches.match('/');
      });
    })
  );
});

// Push notifications (optional - for future features)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: 'vault-vine-notification',
      requireInteraction: false
    };
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Periodic background sync (optional - for future features)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-portfolio') {
    event.waitUntil(
      fetch('/api/sync').catch(() => {
        console.log('[SW] Background sync failed');
      })
    );
  }
});

console.log('[SW] Service Worker loaded');
