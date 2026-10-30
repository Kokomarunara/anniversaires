// Accès aux fichiers d'un dépôt GitHub via l'API REST « contents »

export interface GitHubConfig {
  owner: string;
  repo: string;
  token: string;
}

export class GitHubError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const API = 'https://api.github.com';

function headers(cfg: GitHubConfig, accept = 'application/vnd.github+json'): HeadersInit {
  return {
    Authorization: `Bearer ${cfg.token}`,
    Accept: accept,
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

function contentsUrl(cfg: GitHubConfig, path: string): string {
  const encoded = path.split('/').map(encodeURIComponent).join('/');
  return `${API}/repos/${cfg.owner}/${cfg.repo}/contents/${encoded}`;
}

async function check(res: Response): Promise<Response> {
  if (res.ok) return res;
  let message = res.statusText;
  try {
    message = (await res.json()).message ?? message;
  } catch {
    /* corps non JSON */
  }
  if (res.status === 401) message = 'Le code d’accès a expiré ou n’est plus valide';
  if (res.status === 404) message = 'Données introuvables avec ce code d’accès';
  if (res.status >= 500 || res.status === 0) message = 'Connexion impossible pour le moment, réessaie dans un instant';
  throw new GitHubError(res.status, message);
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64.replace(/\n/g, ''));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

export async function readJson<T>(cfg: GitHubConfig, path: string, fallback: T): Promise<{ data: T; sha?: string }> {
  const res = await fetch(contentsUrl(cfg, path), { headers: headers(cfg), cache: 'no-store' });
  if (res.status === 404) {
    // fichier pas encore créé : on vérifie quand même que le dépôt existe
    await testConnection(cfg);
    return { data: fallback };
  }
  await check(res);
  const json = await res.json();
  return { data: JSON.parse(new TextDecoder().decode(base64ToBytes(json.content))), sha: json.sha };
}

/** Relit le fichier, applique la modification et le réécrit ; recommence si quelqu'un l'a modifié entre-temps. */
export async function updateJson<T>(
  cfg: GitHubConfig,
  path: string,
  fallback: T,
  mutate: (data: T) => T,
  message: string,
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const { data, sha } = await readJson(cfg, path, fallback);
    const next = mutate(data);
    const content = bytesToBase64(new TextEncoder().encode(JSON.stringify(next, null, 2) + '\n'));
    const res = await fetch(contentsUrl(cfg, path), {
      method: 'PUT',
      headers: { ...headers(cfg), 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, content, sha }),
    });
    if ((res.status === 409 || res.status === 422) && attempt < 3) continue;
    await check(res);
    return next;
  }
}

export async function putFile(cfg: GitHubConfig, path: string, data: Blob, message: string): Promise<void> {
  const content = bytesToBase64(new Uint8Array(await data.arrayBuffer()));
  await check(
    await fetch(contentsUrl(cfg, path), {
      method: 'PUT',
      headers: { ...headers(cfg), 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, content }),
    }),
  );
}

export async function deleteFile(cfg: GitHubConfig, path: string, message: string): Promise<void> {
  const res = await fetch(contentsUrl(cfg, path), { headers: headers(cfg), cache: 'no-store' });
  if (res.status === 404) return;
  const { sha } = await (await check(res)).json();
  await check(
    await fetch(contentsUrl(cfg, path), {
      method: 'DELETE',
      headers: { ...headers(cfg), 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, sha }),
    }),
  );
}

export async function readRaw(cfg: GitHubConfig, path: string): Promise<Blob> {
  const res = await fetch(contentsUrl(cfg, path), { headers: headers(cfg, 'application/vnd.github.raw+json') });
  return (await check(res)).blob();
}

/** Vérifie que le dépôt existe et que le jeton peut y écrire. */
export async function testConnection(cfg: GitHubConfig): Promise<void> {
  const res = await check(await fetch(`${API}/repos/${cfg.owner}/${cfg.repo}`, { headers: headers(cfg), cache: 'no-store' }));
  const repo = await res.json();
  if (repo.permissions && !repo.permissions.push) {
    // le jeton doit avoir « Contents : Read and write » sur le dépôt
    throw new GitHubError(403, 'Ce code d’accès permet de lire mais pas d’enregistrer');
  }
}
