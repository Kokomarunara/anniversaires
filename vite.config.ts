import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base relative : l'app fonctionne aussi bien en local que sous /anniversaires/ sur GitHub Pages
export default defineConfig({
  base: './',
  plugins: [react()],
});
