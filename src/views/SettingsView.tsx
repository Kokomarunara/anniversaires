import { useEffect, useState } from 'react';
import type { Settings } from '../settings';
import { NavBar } from '../components/NavBar';
import { setSoundEnabled, sound, soundEnabled } from '../lib/sound';
import { disablePush, enablePush, getPushStatus, syncSubscription, type PushStatus } from '../lib/push';

interface Props {
  settings: Settings;
  onBack: () => void;
  onChange: (settings: Settings) => void;
}

const PUSH_HELP: Partial<Record<PushStatus, string>> = {
  'needs-install': 'Pour recevoir les notifications, ajoute d’abord l’app à l’écran d’accueil : dans Safari, touche Partager › « Sur l’écran d’accueil », puis ouvre-la depuis son icône.',
  unsupported: 'Cet appareil ne peut pas recevoir les notifications.',
  'missing-key': 'Les notifications ne sont pas disponibles pour le moment.',
  denied: 'Les notifications sont bloquées. Réautorise-les dans les réglages du téléphone, puis reviens ici.',
};

export function SettingsView({ settings, onBack, onChange }: Props) {
  const [push, setPush] = useState<PushStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sounds, setSounds] = useState(soundEnabled);

  useEffect(() => {
    getPushStatus().then(setPush);
  }, []);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      sound.error();
      setError((err as Error).message);
    }
    setPush(await getPushStatus());
    setBusy(false);
  }

  function changeHour(hour: number) {
    const next = { ...settings, hour };
    onChange(next);
    if (push === 'on') run(() => syncSubscription(next));
  }

  const canToggle = push === 'on' || push === 'off';

  return (
    <div className="screen">
      <NavBar onBack={onBack} title="Réglages" />

      <section className="group">
        <div className="group-row">
          <label htmlFor="sounds">Petits sons</label>
          <input
            id="sounds"
            type="checkbox"
            role="switch"
            className="switch"
            checked={sounds}
            onChange={(e) => {
              setSoundEnabled(e.target.checked);
              setSounds(e.target.checked);
              if (e.target.checked) sound.success();
            }}
          />
        </div>
      </section>

      <section className="group">
        <div className="group-row">
          <label htmlFor="notifs">Notifications</label>
          <input
            id="notifs"
            type="checkbox"
            role="switch"
            className="switch"
            checked={push === 'on'}
            disabled={!canToggle || busy}
            onChange={(e) => run(() => (e.target.checked ? enablePush(settings) : disablePush(settings)))}
          />
        </div>
        <div className="group-row">
          <label htmlFor="hour">Heure des notifications</label>
          <select id="hour" className="inline-select" value={settings.hour} onChange={(e) => changeHour(Number(e.target.value))}>
            {Array.from({ length: 24 }, (_, h) => (
              <option key={h} value={h}>
                {String(h).padStart(2, '0')}:00
              </option>
            ))}
          </select>
        </div>
      </section>
      {push && PUSH_HELP[push] && <p className="muted settings-note">{PUSH_HELP[push]}</p>}
      {error && (
        <p className="status error settings-note" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
