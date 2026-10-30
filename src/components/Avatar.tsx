import { useEffect, useState } from 'react';
import type { Gender, Person } from '../types';
import type { Store } from '../storage/store';
import { colorFor, hash } from '../lib/colors';

interface Props {
  person: Pick<Person, 'id' | 'name' | 'photo'> & { gender: Gender | null };
  store: Store;
  size: number;
  /** aperçu local d'une photo pas encore enregistrée */
  previewUrl?: string | null;
}

export function Avatar({ person, store, size, previewUrl }: Props) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    setUrl(null);
    if (!person.photo || previewUrl !== undefined) return;
    let cancelled = false;
    store
      .photoUrl(person.photo)
      .then((u) => !cancelled && setUrl(u || null))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [person.photo, store, previewUrl]);

  const shown = previewUrl !== undefined ? previewUrl : url;
  const style = { width: size, height: size };

  if (shown) return <img className="avatar avatar-photo" style={style} src={shown} alt={person.name} />;
  if (!person.gender) {
    return (
      <div className="avatar avatar-empty" style={style} aria-label="Pas encore d’icône">
        <svg viewBox="0 0 24 24" width="38%" height="38%" aria-hidden="true">
          <path d="M12 4v16M4 12h16" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
        </svg>
      </div>
    );
  }
  return (
    <div className="avatar" style={style} aria-label={person.name}>
      <Character seed={person.id} gender={person.gender} />
    </div>
  );
}

// Formes de corps : rond, galet, fleur molle
const BODIES = [
  'M50 6a44 44 0 1 1 0 88a44 44 0 1 1 0-88z',
  'M50 6c32 0 44 12 44 44S82 94 50 94 6 82 6 50 18 6 50 6z',
  'M52 4c13 0 19 9 28 13s15 14 14 27 5 21-2 31-20 18-35 18-25-6-34-14S3 63 5 50 8 26 17 17 39 4 52 4z',
];

/** Petit personnage aux gros yeux : cils et joues roses pour F, sourcils et moustache pour H */
export function Character({ seed, gender }: { seed: string; gender: Gender }) {
  const h = hash(seed);
  const color = colorFor(seed);
  const body = BODIES[h % BODIES.length];
  const look = [-2.5, 0, 2.5][(h >> 3) % 3];
  const lookY = [0, 1.5][(h >> 5) % 2];
  const ink = '#121212';

  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true">
      <path d={body} fill={color} />
      {[38, 62].map((x) => (
        <g key={x}>
          <ellipse cx={x} cy={44} rx={8.5} ry={9.5} fill="#fff" stroke={ink} strokeWidth={2.4} />
          <circle cx={x + look} cy={45 + lookY} r={4} fill={ink} />
        </g>
      ))}
      {gender === 'F' ? (
        <>
          <path d="M29 34l-4-4M33 32l-2-5M43 32l2-5M47 34l4-4M53 34l-4-4M57 32l-2-5M67 32l2-5M71 34l4-4" stroke={ink} strokeWidth={2.2} strokeLinecap="round" />
          <ellipse cx={27} cy={60} rx={6} ry={4} fill={color === '#f6a9c9' ? '#ff6a2b' : '#f6a9c9'} opacity={0.75} />
          <ellipse cx={73} cy={60} rx={6} ry={4} fill={color === '#f6a9c9' ? '#ff6a2b' : '#f6a9c9'} opacity={0.75} />
          <path d="M41 63q9 9 18 0" fill="none" stroke={ink} strokeWidth={3} strokeLinecap="round" />
        </>
      ) : (
        <>
          <path d="M30 30q7-6 14-2M56 28q7-4 14 2" fill="none" stroke={ink} strokeWidth={3} strokeLinecap="round" />
          <path d="M50 60c-4-4-12-4-15 2 5 0 9 0 15-1 6 1 10 1 15 1-3-6-11-6-15-2z" fill={ink} />
          <path d="M45 69q5 4 10 0" fill="none" stroke={ink} strokeWidth={2.6} strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}
