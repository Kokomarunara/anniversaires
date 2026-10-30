import { useState } from 'react';
import type { Settings } from '../settings';
import type { Person } from '../types';
import { NavBar } from '../components/NavBar';
import { setSoundEnabled, sound, soundEnabled } from '../lib/sound';
import { buildCalendar, countEvents, openCalendar } from '../lib/calendar';

interface Props {
  settings: Settings;
  people: Person[];
  onBack: () => void;
  onChange: (settings: Settings) => void;
}

export function SettingsView({ settings, people, onBack, onChange }: Props) {
  const [sounds, setSounds] = useState(soundEnabled);
  const events = countEvents(people);

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
        disabled={events === 0}
        onClick={() => openCalendar(buildCalendar(people, settings.hour), 'anniversaires.ics')}
      >
        <span aria-hidden="true">📅</span> Ajouter tous les anniversaires au calendrier
      </button>
      <p className="muted settings-note">
        {events === 0
          ? 'Ajoute d’abord des anniversaires.'
          : `Ton iPhone t’alertera lui-même (${events} rappel${events > 1 ? 's' : ''}, chaque année). Si tu les as déjà ajoutés, supprime les anciens dans Calendrier pour éviter les doublons.`}
      </p>
    </div>
  );
}
