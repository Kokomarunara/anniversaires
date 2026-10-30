import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { createHash } from 'node:crypto';

const PREVIEWS_DIR = 'public/previews';

// En développement seulement : l'atelier (?atelier) enregistre chaque dessin dans le projet (dessin-1.jpg, dessin-2.jpg…)
function previewDrawingSaver(): Plugin {
  return {
    name: 'preview-drawing-saver',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__save-preview-drawing', (req, res) => {
        const local = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress ?? '');
        if (req.method !== 'POST' || !local) {
          res.statusCode = 403;
          res.end();
          return;
        }
        const chunks: Buffer[] = [];
        req.on('data', (c: Buffer) => chunks.push(c));
        req.on('end', async () => {
          await mkdir(PREVIEWS_DIR, { recursive: true });
          const taken = (await readdir(PREVIEWS_DIR)).map((f) => Number(/^dessin-(\d+)\.jpg$/.exec(f)?.[1] ?? 0));
          const n = Math.max(0, ...taken) + 1;
          await writeFile(`${PREVIEWS_DIR}/dessin-${n}.jpg`, Buffer.concat(chunks));
          res.end(String(n));
        });
      });
    },
  };
}

// À la compilation : écrit dist/version.json, la liste de tous les fichiers de l'app et un numéro de version.
// Le téléphone garde ces fichiers en mémoire (voir public/sw.js) et ne change de version que sur demande.
function offlineManifest(): Plugin {
  let outDir = 'dist';
  return {
    name: 'offline-manifest',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir;
    },
    async closeBundle() {
      const entries = await readdir(outDir, { recursive: true, withFileTypes: true });
      const files = entries
        .filter((e) => e.isFile())
        .map((e) => relative(outDir, join(e.parentPath, e.name)).split(sep).join('/'))
        .filter((f) => f !== 'sw.js' && f !== 'version.json')
        .sort();
      const hash = createHash('sha256');
      for (const f of files) hash.update(f).update(await readFile(join(outDir, f)));
      const manifest = { version: hash.digest('hex').slice(0, 12), builtAt: new Date().toISOString(), files };
      await writeFile(join(outDir, 'version.json'), JSON.stringify(manifest, null, 2));
    },
  };
}

// base relative : l'app fonctionne aussi bien en local que sous /anniversaires/ sur GitHub Pages
export default defineConfig({
  base: './',
  plugins: [react(), previewDrawingSaver(), offlineManifest()],
});
