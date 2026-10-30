import { newId } from './types';
import { GITHUB_OWNER, profile, storageKey } from './profile';

export interface Settings {
  owner: string;
  repo: string;
  token: string;
  deviceId: string;
  deviceLabel: string;
  /** heure locale des notifications (0-23) */
  hour: number;
}

const KEY = storageKey('anniv.settings');

export function loadSettings(): Settings {
  let saved: Partial<Settings> = {};
  try {
    saved = JSON.parse(localStorage.getItem(KEY) ?? '{}');
  } catch {
    /* réglages illisibles : on repart des valeurs par défaut */
  }
  const settings: Settings = {
    owner: GITHUB_OWNER,
    repo: profile.dataRepo,
    token: '',
    deviceId: newId(),
    deviceLabel: 'Mon iPhone',
    hour: 9,
    ...saved,
  };
  if (!saved.deviceId) saveSettings(settings);
  return settings;
}

export function saveSettings(s: Settings): void {
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function hasGitHub(s: Settings): boolean {
  return Boolean(s.owner && s.repo && s.token);
}
