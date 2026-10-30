import { useState } from 'react';
import { isIOS, isInstalled } from '../lib/install';

/** Bouton « Installer sur iPhone », visible tant que l'app est ouverte dans le navigateur */
export function InstallCard() {
  const [steps, setSteps] = useState(false);
  if (isInstalled()) return null;

  return (
    <section className="install-card">
      <button type="button" className="btn-secondary wide" onClick={() => setSteps((s) => !s)}>
        <span aria-hidden="true">📲</span> Installer sur iPhone
      </button>
      <p className="install-platform">Pour iPhone (iOS) · à ouvrir avec Safari</p>
      {steps &&
        (isIOS ? (
          <ol className="install-steps">
            <li>
              Touche <strong>Partager</strong>{' '}
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="(l’icône carré avec une flèche)">
                <path d="M12 3v12M8 7l4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
              </svg>{' '}
              en bas de Safari.
            </li>
            <li>
              Choisis <strong>« Sur l’écran d’accueil »</strong>.
            </li>
            <li>
              Touche <strong>Ajouter</strong>, puis ouvre l’app depuis sa nouvelle icône.
            </li>
          </ol>
        ) : (
          <p className="install-steps">
            Cette app est faite pour <strong>iPhone</strong>. Ouvre ce lien sur ton iPhone, dans <strong>Safari</strong>, puis
            touche à nouveau ce bouton.
          </p>
        ))}
    </section>
  );
}
