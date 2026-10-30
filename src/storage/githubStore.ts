import { normalizePerson, type Person } from '../types';
import { deleteFile, putFile, readJson, readRaw, updateJson, type GitHubConfig } from './github';
import { upsert, type Store } from './store';

const PEOPLE = 'people.json';
const PHOTO_CACHE = 'anniv-photos';

export function createGitHubStore(cfg: GitHubConfig): Store {
  // les chemins de photos sont uniques (horodatés), on peut donc les garder en cache sans limite
  const urls = new Map<string, Promise<string>>();

  async function loadPhoto(path: string): Promise<string> {
    const key = new Request(`${location.origin}/__photos/${cfg.owner}/${cfg.repo}/${path}`);
    let cache: Cache | undefined;
    try {
      cache = await caches.open(PHOTO_CACHE);
    } catch {
      /* Cache API indisponible : on télécharge à chaque fois */
    }
    let res = await cache?.match(key);
    if (!res) {
      const blob = await readRaw(cfg, path);
      res = new Response(blob, { headers: { 'Content-Type': 'image/jpeg' } });
      await cache?.put(key, res.clone());
    }
    return URL.createObjectURL(await res.blob());
  }

  return {
    kind: 'github',

    async list() {
      return (await readJson<Person[]>(cfg, PEOPLE, [])).data.map(normalizePerson);
    },

    async save(person) {
      await updateJson<Person[]>(cfg, PEOPLE, [], (list) => upsert(list, person), `Enregistre ${person.name}`);
    },

    async remove(person) {
      await updateJson<Person[]>(cfg, PEOPLE, [], (list) => list.filter((p) => p.id !== person.id), `Supprime ${person.name}`);
      if (person.photo) await deleteFile(cfg, person.photo, `Supprime la photo de ${person.name}`).catch(() => {});
    },

    async putPhoto(personId, photo) {
      const path = `photos/${personId}-${Date.now()}.jpg`;
      await putFile(cfg, path, photo, 'Ajoute une photo');
      return path;
    },

    async deletePhoto(path) {
      await deleteFile(cfg, path, 'Supprime une photo');
    },

    photoUrl(path) {
      let url = urls.get(path);
      if (!url) {
        url = loadPhoto(path);
        urls.set(path, url);
        url.catch(() => urls.delete(path));
      }
      return url;
    },
  };
}
