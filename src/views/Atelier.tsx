import { useState } from 'react';
import { DrawPad } from '../components/DrawPad';
import { sound } from '../lib/sound';

/** Outil de développement (npm run dev, puis ?atelier) : dessiner les images d'aperçu, enregistrées dans public/previews */
export function Atelier() {
  const [saved, setSaved] = useState<number | null>(null);
  const [error, setError] = useState(false);
  const [round, setRound] = useState(0);

  async function save(drawing: Blob) {
    try {
      const res = await fetch('/__save-preview-drawing', { method: 'POST', body: drawing });
      if (!res.ok) throw new Error();
      setSaved(Number(await res.text()));
      setError(false);
      sound.success();
      // page blanche pour le dessin suivant
      setRound((r) => r + 1);
    } catch {
      setError(true);
      sound.error();
    }
  }

  return (
    <>
      <DrawPad key={round} onCancel={() => setRound((r) => r + 1)} onDone={save} />
      {(saved || error) && (
        <div className="toast atelier-toast" role="status">
          <span>
            {error
              ? 'L’enregistrement n’a pas marché : ouvre l’atelier depuis http://localhost:5173/?atelier'
              : `✓ Dessin n°${saved} enregistré. Tu peux faire le suivant !`}
          </span>
        </div>
      )}
    </>
  );
}
