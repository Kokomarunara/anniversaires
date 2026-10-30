import { normalizePerson, type Person } from '../types';
import { upsert, type Store } from './store';

// Tout reste sur le téléphone : les fiches dans localStorage, les photos dans IndexedDB (plus de place)
const PEOPLE_KEY = 'anniv.people';
const DB_NAME = 'anniversaires';
const PHOTOS = 'photos';

function read(): Person[] {
  try {
    return JSON.parse(localStorage.getItem(PEOPLE_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function write(list: Person[]): void {
  localStorage.setItem(PEOPLE_KEY, JSON.stringify(list));
}

let dbPromise: Promise<IDBDatabase> | null = null;

function db(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(PHOTOS);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function photos<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const store = (await db()).transaction(PHOTOS, mode).objectStore(PHOTOS);
  return new Promise((resolve, reject) => {
    const req = run(store);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// demande au navigateur de ne jamais effacer ces données pour faire de la place
navigator.storage?.persist?.().catch(() => {});

const urls = new Map<string, string>();

export const localStore: Store = {
  async list() {
    return read().map(normalizePerson);
  },

  async save(person) {
    write(upsert(read(), person));
  },

  async remove(person) {
    write(read().filter((p) => p.id !== person.id));
    if (person.photo) await this.deletePhoto(person.photo).catch(() => {});
  },

  async putPhoto(personId, photo) {
    const path = `${personId}-${Date.now()}`;
    try {
      await photos('readwrite', (s) => s.put(photo, path));
    } catch {
      throw new Error('Plus assez de place sur ce téléphone pour cette photo.');
    }
    return path;
  },

  async deletePhoto(path) {
    await photos('readwrite', (s) => s.delete(path));
    const url = urls.get(path);
    if (url) URL.revokeObjectURL(url);
    urls.delete(path);
  },

  async photoUrl(path) {
    let url = urls.get(path);
    if (!url) {
      const blob = await photos<Blob | undefined>('readonly', (s) => s.get(path));
      if (!blob) return '';
      url = URL.createObjectURL(blob);
      urls.set(path, url);
    }
    return url;
  },
};
