// Version de l'app gardée sur le téléphone (lue par public/sw.js) et mises à jour à la demande.
// Une mise à jour ne remplace que les fichiers de l'app : les anniversaires, photos et réglages
// (localStorage, IndexedDB) ne sont jamais touchés.

const META = 'anniv-meta';
const APP_PREFIX = 'anniv-app-';
const scope = new URL('./', location.href).href;

export interface AppVersion {
  version: string;
  builtAt: string;
  files: string[];
}

export function offlineSupported(): boolean {
  return 'caches' in window && 'serviceWorker' in navigator;
}

export async function installedVersion(): Promise<{ version: string; builtAt: string } | null> {
  if (!offlineSupported()) return null;
  const meta = await caches.open(META);
  const [version, builtAt] = await Promise.all([meta.match(scope + '__version'), meta.match(scope + '__builtAt')]);
  return version ? { version: await version.text(), builtAt: (await builtAt?.text()) ?? '' } : null;
}

async function onlineVersion(): Promise<AppVersion> {
  // sans réponse au bout de 8 s (lien coupé, réseau très lent…), on abandonne
  const res = await fetch(`${scope}version.json?t=${Date.now()}`, { cache: 'no-store', signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`version.json : ${res.status}`);
  return res.json();
}

/** Télécharge tous les fichiers d'une version, puis seulement ensuite bascule dessus (rien n'est perdu si ça échoue) */
async function install(v: AppVersion): Promise<void> {
  const name = APP_PREFIX + v.version;
  const cache = await caches.open(name);
  try {
    await Promise.all(
      v.files.map(async (file) => {
        // « ?update » : le service worker laisse passer la requête vers internet
        const res = await fetch(`${scope}${file}?update=${v.version}`, { cache: 'no-store', signal: AbortSignal.timeout(60000) });
        if (!res.ok) throw new Error(`${file} : ${res.status}`);
        await cache.put(scope + file, res);
      }),
    );
  } catch (err) {
    await caches.delete(name);
    throw err;
  }
  const meta = await caches.open(META);
  await meta.put(scope + '__version', new Response(v.version));
  await meta.put(scope + '__builtAt', new Response(v.builtAt));
  for (const key of await caches.keys()) {
    if (key.startsWith(APP_PREFIX) && key !== name) await caches.delete(key);
  }
}

/** Au premier lancement : garde une copie de l'app sur le téléphone, pour qu'elle marche ensuite sans internet */
export async function ensureOfflineCopy(): Promise<void> {
  if (!offlineSupported() || (await installedVersion())) return;
  try {
    await install(await onlineVersion());
  } catch {
    /* pas de connexion : on réessaiera au prochain lancement */
  }
}

export type UpdateCheck =
  | { status: 'latest' }
  | { status: 'available'; next: AppVersion }
  | { status: 'unreachable' };

export async function checkForUpdate(): Promise<UpdateCheck> {
  let next: AppVersion;
  try {
    next = await onlineVersion();
  } catch {
    return { status: 'unreachable' };
  }
  const current = await installedVersion();
  return current?.version === next.version ? { status: 'latest' } : { status: 'available', next };
}

/** Installe la nouvelle version puis relance l'app dessus */
export async function applyUpdate(next: AppVersion): Promise<void> {
  await install(next);
  location.reload();
}
