import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { mkdir, readdir, writeFile } from 'node:fs/promises';

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

// base relative : l'app fonctionne aussi bien en local que sous /anniversaires/ sur GitHub Pages
export default defineConfig({
  base: './',
  plugins: [react(), previewDrawingSaver()],
});
