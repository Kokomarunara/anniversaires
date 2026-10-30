export interface Settings {
  /** heure des alertes ajoutées au calendrier (0-23) */
  hour: number;
}

const KEY = 'anniv.settings';

export function loadSettings(): Settings {
  let saved: Partial<Settings> = {};
  try {
    saved = JSON.parse(localStorage.getItem(KEY) ?? '{}');
  } catch {
    /* réglages illisibles : on repart des valeurs par défaut */
  }
  return { hour: typeof saved.hour === 'number' ? saved.hour : 9 };
}

export function saveSettings(s: Settings): void {
  localStorage.setItem(KEY, JSON.stringify(s));
}
