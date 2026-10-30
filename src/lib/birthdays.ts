export interface ParsedBirthday {
  year: number | null;
  month: number;
  day: number;
}

export const MONTHS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

const DAY_MS = 86_400_000;

export function parseBirthday(value: string): ParsedBirthday {
  const m = /^(?:(\d{4})|-)-(\d{2})-(\d{2})$/.exec(value);
  if (!m) throw new Error(`Date invalide : ${value}`);
  return { year: m[1] ? Number(m[1]) : null, month: Number(m[2]), day: Number(m[3]) };
}

export function formatBirthdayValue(b: ParsedBirthday): string {
  const mm = String(b.month).padStart(2, '0');
  const dd = String(b.day).padStart(2, '0');
  return `${b.year ?? '-'}-${mm}-${dd}`;
}

export function daysInMonth(month: number, year: number | null): number {
  if (month === 2) return year === null || isLeap(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function isLeap(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

// Le 29 février est fêté le 28 les années non bissextiles
function occurrenceIn(b: ParsedBirthday, year: number): number {
  const day = b.month === 2 && b.day === 29 && !isLeap(year) ? 28 : b.day;
  return Date.UTC(year, b.month - 1, day);
}

export interface NextBirthday {
  /** jours restants, 0 = aujourd'hui */
  days: number;
  /** âge atteint ce jour-là, si l'année de naissance est connue */
  age: number | null;
}

export function nextBirthday(value: string, now = new Date()): NextBirthday {
  const b = parseBirthday(value);
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  let year = now.getFullYear();
  let at = occurrenceIn(b, year);
  if (at < today) at = occurrenceIn(b, ++year);
  const age = b.year !== null && year - b.year > 0 ? year - b.year : null;
  return { days: Math.round((at - today) / DAY_MS), age };
}

export function currentAge(value: string, now = new Date()): number | null {
  const { days, age } = nextBirthday(value, now);
  if (age === null) return null;
  return days === 0 ? age : age - 1;
}

/** Date (locale) du prochain anniversaire, aujourd'hui compris */
export function nextBirthdayDate(value: string, now = new Date()): Date {
  const { days } = nextBirthday(value, now);
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + days);
}

/** « 8 décembre » */
export function formatDayMonth(d: Date): string {
  return `${d.getDate() === 1 ? '1er' : d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function daysBeforeLabel(n: number): string {
  if (n === 1) return 'la veille';
  if (n % 7 === 0) return n === 7 ? '1 semaine avant' : `${n / 7} semaines avant`;
  return `${n} jours avant`;
}

/** Année de naissance déduite de l'âge actuel et du jour/mois d'anniversaire */
export function birthYearFromAge(age: number, month: number, day: number, now = new Date()): number {
  const m = now.getMonth() + 1;
  const passed = m > month || (m === month && now.getDate() >= day);
  return now.getFullYear() - age - (passed ? 0 : 1);
}

export function formatBirthday(value: string, withYear = true): string {
  const b = parseBirthday(value);
  const day = b.day === 1 ? '1er' : String(b.day);
  return `${day} ${MONTHS[b.month - 1]}${withYear && b.year ? ` ${b.year}` : ''}`;
}

export function relativeLabel(days: number): string {
  if (days === 0) return "Aujourd'hui 🎂";
  if (days === 1) return 'Demain';
  return `Dans ${days} j`;
}
