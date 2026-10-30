import { useMemo, useState } from 'react';
import type { Person } from '../types';
import type { Store } from '../storage/store';
import { Avatar, Character } from '../components/Avatar';
import { formatBirthday, nextBirthday, relativeLabel } from '../lib/birthdays';

interface Props {
  people: Person[] | null;
  store: Store;
  onOpen: (id: string) => void;
  onAdd: () => void;
  onSettings: () => void;
  /** le Calendrier de l'iPhone n'a pas encore reçu les derniers changements */
  calendarPending?: boolean;
  onCalendar?: () => void;
}

const normalize = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

export function Home({ people, store, onOpen, onAdd, onSettings, calendarPending = false, onCalendar }: Props) {
  const [query, setQuery] = useState('');

  const sorted = useMemo(() => {
    const now = new Date();
    return (people ?? [])
      .map((p) => ({ person: p, next: nextBirthday(p.birthday, now) }))
      .sort((a, b) => a.next.days - b.next.days || a.person.name.localeCompare(b.person.name, 'fr'));
  }, [people]);

  const q = normalize(query.trim());
  const rows = q ? sorted.filter((r) => normalize(r.person.name).includes(q)) : sorted;
  const today = sorted.filter((r) => r.next.days === 0);
  const upcoming = today.length ? today : sorted.slice(0, 1);

  return (
    <div className="screen screen-home">
      <header className="hero">
        <div className="hero-blobs" aria-hidden="true">
          <span className="blob blob-1"><Character seed="deco-a" gender="F" /></span>
          <span className="blob blob-2"><Character seed="deco-bb" gender="M" /></span>
        </div>
        <div className="hero-top">
          <h1 className="hero-title">Anniver&shy;saires</h1>
          <button className="icon-btn on-blue" data-nav onClick={onSettings} aria-label="Réglages">
            <GearIcon />
          </button>
        </div>
        {upcoming.map(({ person, next }) => (
          <button key={person.id} className="hero-next" data-nav onClick={() => onOpen(person.id)}>
            <span className="avatar-wrap">
              <Avatar person={person} store={store} size={64} />
              {next.age !== null && <span className="age-badge small">{next.age}</span>}
            </span>
            <span className="hero-next-text">
              <span className="hero-kicker">{next.days === 0 ? 'Aujourd’hui !' : 'Le prochain'}</span>
              <strong>{person.name}</strong>
              <span>
                {next.days === 0
                  ? next.age !== null
                    ? `fête ses ${next.age} ans 🎉`
                    : 'c’est son anniversaire 🎉'
                  : `${relativeLabel(next.days).toLowerCase()} · ${formatBirthday(person.birthday, false)}`}
              </span>
            </span>
          </button>
        ))}
      </header>

      {people === null ? (
        <div className="grid">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="card skeleton" />
          ))}
        </div>
      ) : people.length === 0 ? (
        <div className="empty">
          <div className="empty-crowd" aria-hidden="true">
            <Character seed="vide-1" gender="F" />
            <Character seed="vide-22" gender="M" />
            <Character seed="vide-333" gender="F" />
          </div>
          <h2>C’est bien vide ici</h2>
          <p>Ajoute une première personne pour ne plus jamais oublier sa date.</p>
          <button className="btn-primary" data-nav onClick={onAdd}>
            Ajouter une personne
          </button>
        </div>
      ) : (
        <>
          {people.length > 4 && (
            <div className="search">
              <input
                type="search"
                placeholder="Rechercher"
                aria-label="Rechercher une personne"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          )}
          {rows.length === 0 ? (
            <p className="muted center">Personne ne s’appelle « {query} ».</p>
          ) : (
            <div className="grid">
              {rows.map(({ person, next }, i) => (
                <button
                  key={person.id}
                  className={`card${next.days === 0 ? ' card-today' : ''}`}
                  data-nav
                  style={{ animationDelay: `${Math.min(i, 8) * 30}ms` }}
                  onClick={() => onOpen(person.id)}
                >
                  <span className="avatar-wrap">
                    <Avatar person={person} store={store} size={84} />
                    {next.age !== null && (
                      <span className="age-badge" aria-label={`va avoir ${next.age} ans`}>
                        {next.age}
                      </span>
                    )}
                  </span>
                  <span className="card-name">{person.name}</span>
                  <span className={`pill${next.days === 0 ? ' pill-today' : next.days <= 7 ? ' pill-soon' : ''}`}>
                    {relativeLabel(next.days)}
                  </span>
                  <span className="card-date">{formatBirthday(person.birthday, false)}</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {people && people.length > 0 && (
        <div className="fab-bar">
          {/* envoie au Calendrier de l'iPhone : rouge qui clignote = pas à jour, vert = à jour */}
          <button
            className={`fab fab-calendar ${calendarPending ? 'is-pending' : 'is-synced'}`}
            onClick={onCalendar}
            aria-label={calendarPending ? 'Envoyer les anniversaires au Calendrier' : 'Calendrier à jour'}
            title={calendarPending ? 'Envoyer au Calendrier' : 'Calendrier à jour'}
          >
            <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
              <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" fill="currentColor" />
            </svg>
          </button>
          <button className="fab" data-nav onClick={onAdd} aria-label="Ajouter une personne">
            <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  );
}
