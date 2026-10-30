import { useEffect, useRef, useState, type FormEvent } from 'react';
import { newId, type Gender, type Person } from '../types';
import type { Store } from '../storage/store';
import { Avatar } from '../components/Avatar';
import { NavBar } from '../components/NavBar';
import { Reminders } from '../components/Reminders';
import { DrawPad } from '../components/DrawPad';
import { MONTHS, birthYearFromAge, currentAge, daysInMonth, formatBirthdayValue, parseBirthday } from '../lib/birthdays';
import { resizePhoto } from '../lib/image';

interface Props {
  person?: Person;
  store: Store;
  onCancel: () => void;
  onSaved: (person: Person) => Promise<void>;
}

type PhotoChange = { kind: 'keep' } | { kind: 'new'; blob: Blob; preview: string } | { kind: 'remove' };

const THIS_YEAR = new Date().getFullYear();

export function EditPerson({ person, store, onCancel, onSaved }: Props) {
  const initial = person ? parseBirthday(person.birthday) : null;
  const [name, setName] = useState(person?.name ?? '');
  // l'id est fixé dès l'ouverture pour que le personnage garde la même couleur après l'ajout
  const [id] = useState(() => person?.id ?? newId());
  const [gender, setGender] = useState<Gender | null>(person?.gender ?? null);
  const [drawFrom, setDrawFrom] = useState<string | null | undefined>(undefined);
  const [day, setDay] = useState(initial ? String(initial.day) : '');
  const [month, setMonth] = useState(initial ? String(initial.month) : '');
  const [year, setYear] = useState(initial?.year ? String(initial.year) : '');
  // année et âge actuel se remplissent l'un l'autre : on retient lequel a été choisi en dernier
  const [age, setAge] = useState('');
  const [yearFrom, setYearFrom] = useState<'year' | 'age'>('year');
  const [remindOnDay, setRemindOnDay] = useState(person?.remindOnDay ?? true);
  const [reminders, setReminders] = useState<number[]>(person?.reminders ?? []);
  const [photo, setPhoto] = useState<PhotoChange>({ kind: 'keep' });
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => () => {
    if (photo.kind === 'new') URL.revokeObjectURL(photo.preview);
  }, [photo]);

  const hasDate = Boolean(day && month);
  const yearNum =
    yearFrom === 'age'
      ? age && hasDate
        ? birthYearFromAge(Number(age), Number(month), Number(day))
        : null
      : year
        ? Number(year)
        : null;
  const ageNow =
    yearFrom === 'age'
      ? age
      : yearNum && hasDate
        ? String(currentAge(formatBirthdayValue({ year: yearNum, month: Number(month), day: Number(day) })) ?? '')
        : '';
  // résumé affiché en direct ; sans jour ni mois, deux réponses sont possibles
  const born = gender === 'F' ? 'Née' : gender === 'M' ? 'Né' : 'Né·e';
  let summary = '';
  if (yearFrom === 'age' && age) {
    const a = Number(age);
    summary = yearNum
      ? `${born} en ${yearNum} · ${a} ${a < 2 ? 'an' : 'ans'}`
      : `${born} en ${THIS_YEAR - a - 1} ou ${THIS_YEAR - a} · choisis le jour et le mois pour préciser`;
  } else if (yearFrom === 'year' && yearNum) {
    const a = THIS_YEAR - yearNum;
    summary = ageNow
      ? `${born} en ${yearNum} · ${ageNow} ${Number(ageNow) < 2 ? 'an' : 'ans'}`
      : `${born} en ${yearNum} · ${a > 0 ? `${a - 1} ou ${a} ans` : 'moins d’un an'}, choisis le jour et le mois pour préciser`;
  }

  const dayInvalid = day !== '' && month !== '' && Number(day) > daysInMonth(Number(month), yearNum);
  const missing = !name.trim() || !gender || !day || !month;
  const canSave = !missing && !dayInvalid && !saving;

  async function pickPhoto(file: File | undefined) {
    if (!file) return;
    try {
      const blob = await resizePhoto(file);
      setPhoto({ kind: 'new', blob, preview: URL.createObjectURL(blob) });
    } catch {
      setError('Cette image n’a pas pu être lue. Essaie avec une autre photo.');
    }
  }

  // le dessin part de la photo actuelle, s'il y en a une
  async function openDrawPad() {
    let from: string | null = null;
    if (photo.kind === 'new') from = photo.preview;
    else if (photo.kind === 'keep' && person?.photo) from = await store.photoUrl(person.photo).catch(() => null);
    setDrawFrom(from);
  }

  async function submit(e?: FormEvent) {
    e?.preventDefault();
    setTouched(true);
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      let photoPath = person?.photo ?? null;
      if (photo.kind !== 'keep') {
        if (photoPath) await store.deletePhoto(photoPath).catch(() => {});
        photoPath = photo.kind === 'new' ? await store.putPhoto(id, photo.blob) : null;
      }
      await onSaved({
        id,
        name: name.trim(),
        gender: gender!,
        birthday: formatBirthdayValue({ year: yearNum, month: Number(month), day: Number(day) }),
        photo: photoPath,
        notes: person?.notes ?? '',
        remindOnDay,
        reminders,
      });
    } catch (err) {
      setError(`Enregistrement impossible : ${(err as Error).message}`);
      setSaving(false);
    }
  }

  const preview = photo.kind === 'new' ? photo.preview : photo.kind === 'remove' ? null : undefined;
  const hasPhoto = photo.kind === 'new' || (photo.kind === 'keep' && person?.photo);

  return (
    <form className="screen" onSubmit={submit} noValidate>
      <NavBar
        onBack={onCancel}
        backLabel="Annuler"
        title={person ? 'Modifier' : 'Nouvelle personne'}
        action={{ label: saving ? 'Enregistrement…' : person ? 'Enregistrer' : 'Ajouter', onClick: () => submit(), disabled: saving, bold: true }}
      />

      <div className="photo-picker">
        <button type="button" className="photo-btn" onClick={() => fileInput.current?.click()} aria-label="Choisir une photo">
          <Avatar person={{ id, gender, name, photo: person?.photo ?? null }} store={store} size={120} previewUrl={preview} />
        </button>
        <div className="photo-actions">
          <button type="button" className="chip" onClick={() => fileInput.current?.click()}>
            <span aria-hidden="true">📷</span> {hasPhoto ? 'Changer' : 'Photo'}
          </button>
          <button type="button" className="chip" onClick={openDrawPad}>
            <span aria-hidden="true">🖍️</span> Dessiner
          </button>
          {hasPhoto && (
            <button type="button" className="chip chip-danger" onClick={() => setPhoto({ kind: 'remove' })}>
              Retirer
            </button>
          )}
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            pickPhoto(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </div>

      <div className="field">
        <label htmlFor="name">Nom</label>
        <input
          id="name"
          className="input"
          value={name}
          autoComplete="off"
          onChange={(e) => setName(e.target.value)}
          aria-invalid={touched && !name.trim()}
        />
        {touched && !name.trim() && <p className="field-error">Indique un nom.</p>}
      </div>

      <div className="field">
        <span className="label" id="gender-label">Icône par défaut</span>
        <div className="segmented" role="radiogroup" aria-labelledby="gender-label">
          {(['F', 'M'] as const).map((g) => (
            <button
              key={g}
              type="button"
              role="radio"
              aria-checked={gender === g}
              className={gender === g ? 'active' : ''}
              onClick={() => setGender(g)}
            >
              {g === 'F' ? 'Femme' : 'Homme'}
            </button>
          ))}
        </div>
        {touched && !gender && <p className="field-error">Choisis Femme ou Homme.</p>}
      </div>

      <div className="field">
        <span className="label">Jour d’anniversaire</span>
        <div className="date-row">
          <select aria-label="Jour" className="input" value={day} onChange={(e) => setDay(e.target.value)}>
            <option value="">Jour</option>
            {Array.from({ length: 31 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {i + 1}
              </option>
            ))}
          </select>
          <select aria-label="Mois" className="input" value={month} onChange={(e) => setMonth(e.target.value)}>
            <option value="">Mois</option>
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>
                {m[0].toUpperCase() + m.slice(1)}
              </option>
            ))}
          </select>
        </div>
        {touched && (!day || !month) && <p className="field-error">Choisis le jour et le mois.</p>}
        {dayInvalid && <p className="field-error">Ce mois n’a pas de {day}.</p>}
      </div>

      <div className="field">
        <span className="label">Année de naissance ou âge actuel</span>
        <div className="pair-row">
          <select
            aria-label="Année de naissance"
            className="input"
            value={yearNum ? String(yearNum) : ''}
            onChange={(e) => {
              setYearFrom('year');
              setYear(e.target.value);
            }}
          >
            <option value="">Année ?</option>
            {Array.from({ length: THIS_YEAR - 1899 }, (_, i) => THIS_YEAR - i).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <select
            aria-label="Âge actuel"
            className="input"
            value={ageNow}
            onChange={(e) => {
              setYearFrom('age');
              setAge(e.target.value);
            }}
          >
            <option value="">Âge ?</option>
            {Array.from({ length: 111 }, (_, a) => (
              <option key={a} value={a}>
                {a} {a < 2 ? 'an' : 'ans'}
              </option>
            ))}
          </select>
        </div>
        {summary ? (
          <p className="live-summary" aria-live="polite">
            {summary}
          </p>
        ) : (
          <p className="field-hint">Facultatif. Remplis l’un, l’autre se calcule tout seul.</p>
        )}
      </div>

      <div className="field">
        <span className="label">Rappels</span>
        <Reminders
          birthday={hasDate && !dayInvalid ? formatBirthdayValue({ year: yearNum, month: Number(month), day: Number(day) }) : null}
          remindOnDay={remindOnDay}
          reminders={reminders}
          onChange={(patch) => {
            if (patch.remindOnDay !== undefined) setRemindOnDay(patch.remindOnDay);
            if (patch.reminders) setReminders(patch.reminders);
          }}
        />
      </div>

      {error && <p className="form-error" role="alert">{error}</p>}

      <button type="submit" className="btn-primary wide" disabled={saving}>
        {saving ? 'Enregistrement…' : person ? 'Enregistrer' : 'Ajouter'}
      </button>

      {drawFrom !== undefined && (
        <DrawPad
          startFrom={drawFrom}
          onCancel={() => setDrawFrom(undefined)}
          onDone={(blob) => {
            setPhoto({ kind: 'new', blob, preview: URL.createObjectURL(blob) });
            setDrawFrom(undefined);
          }}
        />
      )}
    </form>
  );
}
