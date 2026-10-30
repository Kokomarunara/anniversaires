// Une seule app, deux liens : chaque profil a son propre dépôt de données.
//   …/anniversaires/         → profil principal
//   …/anniversaires/ketura/  → profil de Ketura

export const GITHUB_OWNER = 'Kokomarunara';

interface Profile {
  /** sert à séparer les données enregistrées sur l'appareil */
  id: string;
  dataRepo: string;
}

const PROFILES: Profile[] = [{ id: 'ketura', dataRepo: 'anniversaires-data-ketura' }];
const MAIN: Profile = { id: 'main', dataRepo: 'anniversaires-data' };

export const profile: Profile =
  PROFILES.find((p) => location.pathname.split('/').includes(p.id)) ?? MAIN;

/** clé de stockage local propre au profil (les deux liens partagent le même domaine) */
export function storageKey(name: string): string {
  return profile.id === MAIN.id ? name : `${name}.${profile.id}`;
}
