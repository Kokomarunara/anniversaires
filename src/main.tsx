import { createRoot } from 'react-dom/client';
import { App } from './App';
import '@fontsource-variable/bricolage-grotesque';
import './styles.css';
import { installTapSounds } from './lib/sound';
import { ensureOfflineCopy } from './lib/offline';

createRoot(document.getElementById('root')!).render(<App />);
installTapSounds();

if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    // garde l'app sur le téléphone pour qu'elle marche sans internet ni lien (voir lib/offline.ts)
    navigator.serviceWorker
      .register('./sw.js')
      .then(() => navigator.serviceWorker.ready)
      .then(ensureOfflineCopy)
      .catch(() => {
        /* pas de service worker (ex. http non sécurisé) : l'app marche, mais pas hors-ligne */
      });
  } else {
    // en développement, pas de copie hors-ligne : on voit toujours le code à jour
    navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()));
  }
}
