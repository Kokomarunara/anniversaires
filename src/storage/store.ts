import type { Person } from '../types';

export interface Store {
  list(): Promise<Person[]>;
  /** ajoute ou remplace (selon l'id) */
  save(person: Person): Promise<void>;
  remove(person: Person): Promise<void>;
  /** enregistre une photo et renvoie sa référence */
  putPhoto(personId: string, photo: Blob): Promise<string>;
  deletePhoto(path: string): Promise<void>;
  /** URL affichable pour une référence de photo */
  photoUrl(path: string): Promise<string>;
}

export function upsert(list: Person[], person: Person): Person[] {
  const i = list.findIndex((p) => p.id === person.id);
  if (i === -1) return [...list, person];
  const next = [...list];
  next[i] = person;
  return next;
}
