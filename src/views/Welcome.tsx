import { useState, type FormEvent } from 'react';
import type { Settings } from '../settings';
import { testConnection } from '../storage/github';
import { Character } from '../components/Avatar';
import { sound } from '../lib/sound';

interface Props {
  settings: Settings;
  onConnected: (settings: Settings) => void;
}

/** Affiché une seule fois, au premier lancement sur l'appareil : on colle le code d'accès (jeton GitHub) */
export function Welcome({ settings, onConnected }: Props) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const token = code.trim();
    if (!token) {
      setError('Colle ton code d’accès pour continuer.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await testConnection({ ...settings, token });
      sound.success();
      onConnected({ ...settings, token });
    } catch {
      sound.error();
      setError('Ce code ne fonctionne pas. Vérifie qu’il est copié en entier.');
      setBusy(false);
    }
  }

  return (
    <form className="screen welcome" onSubmit={submit} noValidate>
      <div className="welcome-crowd" aria-hidden="true">
        <Character seed="bienvenue-1" gender="F" />
        <Character seed="bienvenue-22" gender="M" />
        <Character seed="bienvenue-333" gender="F" />
      </div>
      <h1>Bienvenue !</h1>
      <p>Colle ton code d’accès pour retrouver tes anniversaires.</p>
      <div className="field">
        <label htmlFor="code">Code d’accès</label>
        <input
          id="code"
          className="input"
          type="password"
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setError(null);
          }}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          aria-invalid={Boolean(error)}
        />
        {error && <p className="field-error">{error}</p>}
      </div>
      <button type="submit" className="btn-primary wide" disabled={busy}>
        {busy ? 'Vérification…' : 'Continuer'}
      </button>
    </form>
  );
}
