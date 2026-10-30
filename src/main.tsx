import { createRoot } from 'react-dom/client';
import { App } from './App';
import '@fontsource-variable/bricolage-grotesque';
import './styles.css';
import { installTapSounds } from './lib/sound';

createRoot(document.getElementById('root')!).render(<App />);
installTapSounds();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {
    /* pas de service worker (ex. http non sécurisé) : l'app marche sans hors-ligne ni notifications */
  });
}
