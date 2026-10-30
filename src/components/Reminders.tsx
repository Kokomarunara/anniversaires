import { useState } from 'react';
import { MONTHS, daysBeforeLabel, formatDayMonth, nextBirthdayDate } from '../lib/birthdays';

/** on peut programmer un rappel jusqu'à 4 mois avant */
const MAX_DAYS_BEFORE = 120;
const DAY_MS = 86_400_000;
const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

interface Props {
  /** valeur d'anniversaire ("1990-12-15" / "--12-15"), null si la date n'est pas encore choisie */
  birthday: string | null;
  remindOnDay: boolean;
  reminders: number[];
  onChange: (patch: { remindOnDay?: boolean; reminders?: number[] }) => void;
}

export function Reminders({ birthday, remindOnDay, reminders, onChange }: Props) {
  const [picking, setPicking] = useState(false);
  const target = birthday ? nextBirthdayDate(birthday) : null;
  const sorted = [...reminders].sort((a, b) => b - a);

  return (
    <section className="group reminders">
      <div className="group-row">
        <label htmlFor="remind-day">Rappel le jour J</label>
        <input
          id="remind-day"
          type="checkbox"
          role="switch"
          className="switch"
          checked={remindOnDay}
          onChange={(e) => onChange({ remindOnDay: e.target.checked })}
        />
      </div>

      {target &&
        sorted.map((n) => (
          <div key={n} className="group-row reminder-row">
            <span>
              <span aria-hidden="true">🔔 </span>
              {formatDayMonth(new Date(target.getFullYear(), target.getMonth(), target.getDate() - n))}
              <span className="reminder-sub"> · {daysBeforeLabel(n)}</span>
            </span>
            <button
              type="button"
              className="icon-btn remove-btn"
              aria-label={`Supprimer le rappel ${daysBeforeLabel(n)}`}
              onClick={() => onChange({ reminders: reminders.filter((r) => r !== n) })}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        ))}

      {picking && target ? (
        <Calendar
          target={target}
          chosen={reminders}
          onPick={(n) => {
            onChange({ reminders: [...reminders, n] });
            setPicking(false);
          }}
          onClose={() => setPicking(false)}
        />
      ) : (
        <div className="group-row">
          <button type="button" className="add-reminder" onClick={() => setPicking(true)} disabled={!target}>
            <span className="add-reminder-plus" aria-hidden="true">+</span>
            {target ? 'Ajouter un rappel' : 'Choisis d’abord la date pour ajouter un rappel'}
          </button>
        </div>
      )}
    </section>
  );
}

interface CalendarProps {
  target: Date;
  chosen: number[];
  onPick: (daysBefore: number) => void;
  onClose: () => void;
}

/** Calendrier des semaines qui précèdent l'anniversaire */
function Calendar({ target, chosen, onPick, onClose }: CalendarProps) {
  const earliest = new Date(target.getFullYear(), target.getMonth(), target.getDate() - MAX_DAYS_BEFORE);
  // on ouvre sur le mois qui contient la semaine avant l'anniversaire
  const [view, setView] = useState(() => new Date(target.getFullYear(), target.getMonth() - (target.getDate() > 7 ? 0 : 1), 1));

  const canPrev = view > new Date(earliest.getFullYear(), earliest.getMonth(), 1);
  const canNext = view < new Date(target.getFullYear(), target.getMonth(), 1);
  const shift = (delta: number) => setView(new Date(view.getFullYear(), view.getMonth() + delta, 1));

  // lundi = première colonne
  const lead = (view.getDay() + 6) % 7;
  const count = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: count }, (_, i) => new Date(view.getFullYear(), view.getMonth(), i + 1)),
  ];

  return (
    <div className="calendar">
      <div className="calendar-head">
        <button type="button" className="icon-btn" onClick={() => shift(-1)} disabled={!canPrev} aria-label="Mois précédent">
          ‹
        </button>
        <strong>
          {MONTHS[view.getMonth()][0].toUpperCase() + MONTHS[view.getMonth()].slice(1)} {view.getFullYear()}
        </strong>
        <button type="button" className="icon-btn" onClick={() => shift(1)} disabled={!canNext} aria-label="Mois suivant">
          ›
        </button>
      </div>
      <p className="calendar-hint">Touche le jour où tu veux être prévenu·e.</p>
      <div className="calendar-grid" role="grid">
        {WEEKDAYS.map((w, i) => (
          <span key={i} className="calendar-weekday" aria-hidden="true">
            {w}
          </span>
        ))}
        {cells.map((d, i) => {
          if (!d) return <span key={i} />;
          const n = Math.round((target.getTime() - d.getTime()) / DAY_MS);
          const isBirthday = n === 0;
          const taken = chosen.includes(n);
          const allowed = n >= 1 && n <= MAX_DAYS_BEFORE && !taken;
          return (
            <button
              key={i}
              type="button"
              className={`calendar-day${isBirthday ? ' is-birthday' : ''}${taken ? ' is-taken' : ''}`}
              disabled={!allowed}
              aria-label={isBirthday ? `${formatDayMonth(d)}, anniversaire` : `${formatDayMonth(d)}, ${daysBeforeLabel(n)}`}
              onClick={() => onPick(n)}
            >
              {isBirthday ? '🎂' : d.getDate()}
            </button>
          );
        })}
      </div>
      <button type="button" className="btn-link calendar-close" onClick={onClose}>
        Fermer
      </button>
    </div>
  );
}
