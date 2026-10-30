import { useEffect, useState } from 'react';
import type { Settings } from '../settings';
import type { Person } from '../types';
import { NavBar } from '../components/NavBar';
import { setSoundEnabled, sound, soundEnabled } from '../lib/sound';
import { resendAllToCalendar } from '../lib/calendar';
import { applyUpdate, checkForUpdate, installedVersion, offlineSupported, type AppVersion } from '../lib/offline';

interface Props {
  settings: Settings;
  people: Person[];
  onBack: () => void;
  onChange: (settings: Settings) => void;
  onCalendarResent: () => void;
}

type UpdateState =
  | { step: 'idle' | 'checking' | 'installing' | 'failed' | 'latest' | 'unreachable' }
  | { step: 'available'; next: AppVersion };

const formatDate = (iso: string) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

export function SettingsView({ settings, people, onBack, onChange, onCalendarResent }: Props) {
  const [sounds, setSounds] = useState(soundEnabled);
  const [installed, setInstalled] = useState<string | null>(null);
  const [update, setUpdate] = useState<UpdateState>({ step: 'idle' });

  useEffect(() => {
    installedVersion().then((v) => setInstalled(v ? formatDate(v.builtAt) : null));
  }, []);

  async function check() {
    setUpdate({ step: 'checking' });
    const result = await checkForUpdate();
    if (result.status === 'available') {
      sound.success();
      setUpdate({ step: 'available', next: result.next });
    } else {
      setUpdate({ step: result.status });
    }
  }

  async function install() {
    if (update.step !== 'available') return;
    const { next } = update;
    setUpdate({ step: 'installing' });
    try {
      await applyUpdate(next);
    } catch {
      sound.error();
      setUpdate({ step: 'failed' });
    }
  }

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
          <label htmlFor="hour">Heure des rappels</label>
          <select id="hour" className="inline-select" value={settings.hour} onChange={(e) => onChange({ hour: Number(e.target.value) })}>
            {Array.from({ length: 24 }, (_, h) => (
              <option key={h} value={h}>
                {String(h).padStart(2, '0')}:00
              </option>
            ))}
          </select>
        </div>
      </section>

      <button
        type="button"
        className="btn-secondary wide calendar-btn"
        disabled={people.length === 0}
        onClick={async () => {
          await resendAllToCalendar(people, settings.hour);
          onCalendarResent();
        }}
      >
        <span aria-hidden="true">📅</span> Tout renvoyer au calendrier
      </button>
      <p className="muted settings-note">
        D’habitude, le bouton 📅 de l’accueil suffit : il clignote quand il y a du nouveau et n’envoie que ce qui manque.
        Celui-ci renvoie absolument tout, par exemple si tu as effacé les anniversaires dans Calendrier.
      </p>

      {offlineSupported() && (
        <>
          <h2 className="section-title">Mise à jour</h2>
          <section className="group">
            <div className="group-row">
              <span>Version installée</span>
              <span className="muted">{installed ?? '—'}</span>
            </div>
          </section>
          {update.step === 'available' ? (
            <button type="button" className="btn-primary wide" onClick={install}>
              Installer la mise à jour
            </button>
          ) : (
            <button
              type="button"
              className="btn-secondary wide"
              onClick={check}
              disabled={update.step === 'checking' || update.step === 'installing'}
            >
              {update.step === 'checking' ? 'Recherche…' : update.step === 'installing' ? 'Installation…' : 'Rechercher une mise à jour'}
            </button>
          )}
          <p className="muted settings-note update-note" aria-live="polite">
            {update.step === 'latest'
              ? '✓ Tu as déjà la dernière version.'
              : update.step === 'available'
                ? `Une nouvelle version est disponible (du ${formatDate(update.next.builtAt)}). Tes anniversaires, photos et réglages sont conservés.`
                : update.step === 'unreachable'
                  ? 'Impossible de vérifier pour l’instant (pas de connexion, ou le lien n’est plus en ligne). L’app continue de marcher normalement.'
                  : update.step === 'failed'
                    ? 'La mise à jour n’a pas pu se terminer. Rien n’a changé : ta version actuelle et tes données sont intactes.'
                    : 'L’app marche sans internet. Elle ne change de version que si tu le demandes ici.'}
          </p>
        </>
      )}
    </div>
  );
}
