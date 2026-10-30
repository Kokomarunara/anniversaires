// Service worker : l'app marche sans internet et même si le lien est désactivé.
// Les fichiers de l'app sont gardés dans un cache « anniv-app-<version> » ; la version utilisée est notée dans « anniv-meta ».
// Il ne change JAMAIS de version tout seul : c'est Réglages › « Rechercher une mise à jour » qui en installe une autre
// (voir src/lib/offline.ts). Les données (localStorage, IndexedDB) ne sont jamais touchées ici.
const META = 'anniv-meta';
const CALENDAR = 'anniv-calendar';
const SCOPE = self.registration.scope;
// anciens caches des premières versions de l'app, qui ne servent plus
const LEGACY = ['anniv-app-v1', 'anniv-app-v2', 'anniv-photos'];

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => LEGACY.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function installedCache() {
  const meta = await caches.open(META);
  const version = await meta.match(SCOPE + '__version');
  return version ? caches.open('anniv-app-' + (await version.text())) : null;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || !url.href.startsWith(SCOPE)) return;

  // recherche de mise à jour et téléchargement d'une nouvelle version : toujours en ligne
  if (url.pathname.endsWith('/version.json') || url.searchParams.has('update')) return;

  // fichier du Calendrier préparé par l'app (voir src/lib/calendar.ts)
  if (url.pathname.endsWith('/calendrier.ics')) {
    event.respondWith(
      caches
        .open(CALENDAR)
        .then((c) => c.match(SCOPE + 'calendrier.ics'))
        .then((hit) => hit ?? new Response('', { status: 404 })),
    );
    return;
  }

  // la version installée d'abord ; internet seulement pour ce qu'elle ne contient pas
  event.respondWith(
    (async () => {
      const cache = await installedCache();
      if (cache) {
        const key = request.mode === 'navigate' ? SCOPE + 'index.html' : url.origin + url.pathname;
        const hit = await cache.match(key);
        if (hit) return hit;
      }
      return fetch(request);
    })(),
  );
});
