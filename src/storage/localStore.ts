import { normalizePerson, type Person } from '../types';
import { blobToDataUrl } from '../lib/image';
import { storageKey } from '../profile';
import { upsert, type Store } from './store';

// Mode démo : tout reste dans le navigateur de cet appareil
const PEOPLE_KEY = storageKey('anniv.demo.people');
const PHOTO_PREFIX = storageKey('anniv.demo.photo') + '.';

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

export const localStore: Store = {
  kind: 'demo',

  async list() {
    return read().map(normalizePerson);
  },

  async save(person) {
    write(upsert(read(), person));
  },

  async remove(person) {
    write(read().filter((p) => p.id !== person.id));
    if (person.photo) localStorage.removeItem(PHOTO_PREFIX + person.photo);
  },

  async putPhoto(personId, photo) {
    const path = `local:${personId}-${Date.now()}`;
    try {
      localStorage.setItem(PHOTO_PREFIX + path, await blobToDataUrl(photo));
    } catch {
      throw new Error('Plus assez de place sur cet appareil pour cette photo.');
    }
    return path;
  },

  async deletePhoto(path) {
    localStorage.removeItem(PHOTO_PREFIX + path);
  },

  async photoUrl(path) {
    return localStorage.getItem(PHOTO_PREFIX + path) ?? '';
  },
};
