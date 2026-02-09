/* service-worker.js */
const CACHE_VERSION = '2026-02-08-v8'; // <-- TROQUE quando publicar atualização
const CACHE_NAME = `olacarlopolis-${CACHE_VERSION}`;

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/images/img_padrao_site/icon-192_2.png',
  '/images/img_padrao_site/icon-512_2.png',
];

// Instala e já “assume” a nova versão
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
});

// Ativa, limpa caches antigos e assume o controle das abas abertas
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((k) => k.startsWith('olacarlopolis-') && k !== CACHE_NAME)
        .map((k) => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

// Permite forçar “pular espera” via postMessage
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

// Estratégias de cache
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Só trata requisições do seu domínio (evita problemas com cdn / terceiros)
  if (url.origin !== self.location.origin) return;

  // NETWORK FIRST para HTML/navegação (não ficar preso em index antigo)
  const isNavigation =
    req.mode === 'navigate' ||
    (req.headers.get('accept') || '').includes('text/html');

  if (isNavigation) {
    event.respondWith(networkFirst(req));
    return;
  }

  // STALE-WHILE-REVALIDATE para arquivos estáticos (css/js/img)
  event.respondWith(staleWhileRevalidate(req));
});

async function networkFirst(req) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const fresh = await fetch(req, { cache: 'no-store' });
    // Atualiza cache do HTML
    cache.put(req, fresh.clone());
    return fresh;
  } catch (e) {
    const cached = await cache.match(req);
    return cached || caches.match('/index.html');
  }
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(req);

  const fetchPromise = fetch(req)
    .then((res) => {
      // Só guarda respostas válidas
      if (res && res.status === 200) cache.put(req, res.clone());
      return res;
    })
    .catch(() => null);

  // Responde rápido do cache, mas atualiza em paralelo
  return cached || (await fetchPromise) || new Response('', { status: 504 });
}
