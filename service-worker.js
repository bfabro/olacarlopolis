const cacheName = 'olacarlopolis-v1';
const assets = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  
  '/images/img_padrao_site/icon-192_2.png',
  '/images/img_padrao_site/icon-512_2.png'
];

// Instala o service worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(cacheName).then((cache) => {
      return cache.addAll(assets);
    })
  );
});

// Intercepta as requisições
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((resposta) => {
      return resposta || fetch(event.request);
    })
  );
});
