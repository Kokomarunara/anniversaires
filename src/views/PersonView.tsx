import { useEffect, useRef, useState } from 'react';
import type { Person } from '../types';
import type { Store } from '../storage/store';
import { Avatar } from '../components/Avatar';
import { NavBar } from '../components/NavBar';
import { Reminders } from '../components/Reminders';
import { currentAge, formatBirthday, nextBirthday } from '../lib/birthdays';
import { colorFor, inkOn } from '../lib/colors';
import { sound } from '../lib/sound';
import { buildCalendar, openCalendar } from '../lib/calendar';

interface Props {
  person: Person;
  store: Store;
  /** heure des alertes du calendrier */
  hour: number;
  onBack: () => void;
  onEdit: () => void;
  onSave: (person: Person) => Promise<void>;
  onDelete: (person: Person) => Promise<void>;
}

type NoteState = 'idle' | 'saving' | 'saved' | 'error';

export function PersonView({ person, store, hour, onBack, onEdit, onSave, onDelete }: Props) {
  const [notes, setNotes] = useState(person.notes);
  const [noteState, setNoteState] = useState<NoteState>('idle');
  const latest = useRef(person);
  latest.current = person;

  const next = nextBirthday(person.birthday);
  const age = currentAge(person.birthday);

  async function saveNotes(value: string) {
    if (value === latest.current.notes) return;
    setNoteState('saving');
    try {
      await onSave({ ...latest.current, notes: value });
      setNoteState('saved');
    } catch {
      setNoteState('error');
    }
  }

  // petite fanfare quand on ouvre la fiche le jour de l'anniversaire
  useEffect(() => {
    if (next.days === 0) setTimeout(sound.party, 250);
  }, []);

  // enregistrement automatique 1 s après la dernière frappe
  useEffect(() => {
    if (notes === person.notes) return;
    const t = setTimeout(() => saveNotes(notes), 1000);
    return () => clearTimeout(t);
  }, [notes]);

  async function remove() {
    if (!confirm(`Supprimer ${person.name} et toutes ses notes ?`)) return;
    await onDelete(person);
  }

  const band = colorFor(person.id);

  return (
    <div className="screen">
      <div className="profile-band" style={{ background: band, color: inkOn(band) }}>
        <NavBar onBack={onBack} action={{ label: 'Modifier', onClick: onEdit, nav: true }} />
      </div>

      <div className="profile">
        <div className="profile-avatar">
          <Avatar person={person} store={store} size={132} />
        </div>
        <h1>{person.name}</h1>
        <p className="profile-date">{formatBirthday(person.birthday)}</p>
        <p className={`profile-next${next.days === 0 ? ' is-today' : ''}`}>
          {next.days === 0
            ? age !== null
              ? `Fête ses ${age} ans aujourd’hui 🎂`
              : 'C’est son anniversaire aujourd’hui 🎂'
            : `${next.age !== null ? `Aura ${next.age} ans` : 'Anniversaire'} ${next.days === 1 ? 'demain' : `dans ${next.days} jours`}`}
        </p>
      </div>

      <h2 className="section-title">Rappels</h2>
      <Reminders
        birthday={person.birthday}
        remindOnDay={person.remindOnDay}
        reminders={person.reminders}
        onChange={(patch) => onSave({ ...person, ...patch })}
      />
      <button
        type="button"
        className="btn-secondary wide calendar-btn"
        disabled={!person.remindOnDay && person.reminders.length === 0}
        onClick={() => openCalendar(buildCalendar([person], hour), `anniversaire-${person.name}.ics`)}
      >
        <span aria-hidden="true">📅</span> Ajouter au calendrier
      </button>
      <p className="muted reminders-note">
        Ton iPhone t’alertera à {String(hour).padStart(2, '0')}:00. Si tu changes les rappels plus tard, ajoute-les de nouveau et
        supprime les anciens dans Calendrier.
      </p>

      <section>
        <div className="section-head">
          <h2 className="section-title">Mémo</h2>
          <span className="note-state" aria-live="polite">
            {noteState === 'saving' && 'Enregistrement…'}
            {noteState === 'saved' && 'Enregistré'}
            {noteState === 'error' && 'Échec de l’enregistrement, réessaie'}
          </span>
        </div>
        <textarea
          className="memo"
          aria-label={`Mémo sur ${person.name}`}
          placeholder="Ce qu’elle ou il aime, idées de cadeaux, taille…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => saveNotes(notes)}
        />
      </section>

      <button className="btn-danger" onClick={remove}>
        Supprimer {person.name}
      </button>
    </div>
  );
}
