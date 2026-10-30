// Export des anniversaires vers le Calendrier de l'iPhone (fichier .ics).
// C'est le calendrier du téléphone qui envoie les alertes : aucune connexion n'est nécessaire.
import type { Person } from '../types';
import { daysBeforeLabel, formatBirthday, parseBirthday } from './birthdays';

const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;

function escape(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function stamp(): string {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
}

interface CalEvent {
  uid: string;
  date: Date;
  rrule: string;
  summary: string;
  description?: string;
  /** heure de l'alerte le jour de l'événement */
  hour: number;
}

function vevent(e: CalEvent): string[] {
  const end = new Date(e.date.getFullYear(), e.date.getMonth(), e.date.getDate() + 1);
  return [
    'BEGIN:VEVENT',
    `UID:${e.uid}`,
    `DTSTAMP:${stamp()}`,
    `DTSTART;VALUE=DATE:${ymd(e.date)}`,
    `DTEND;VALUE=DATE:${ymd(end)}`,
    `RRULE:${e.rrule}`,
    `SUMMARY:${escape(e.summary)}`,
    ...(e.description ? [`DESCRIPTION:${escape(e.description)}`] : []),
    'TRANSP:TRANSPARENT',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escape(e.summary)}`,
    `TRIGGER;RELATED=START:PT${e.hour}H`,
    'END:VALARM',
    'END:VEVENT',
  ];
}

function eventsFor(p: Person, hour: number): CalEvent[] {
  const b = parseBirthday(p.birthday);
  const year = new Date().getFullYear();
  const leapDay = b.month === 2 && b.day === 29;
  // le 29 février est fêté le dernier jour de février
  const day = leapDay ? new Date(year, 2, 0) : new Date(year, b.month - 1, b.day);
  const born = b.year ? `${p.gender === 'F' ? 'Née' : 'Né'} en ${b.year}` : undefined;
  const events: CalEvent[] = [];

  if (p.remindOnDay) {
    events.push({
      uid: `${p.id}-j@anniversaires`,
      date: day,
      rrule: leapDay ? 'FREQ=YEARLY;BYMONTH=2;BYMONTHDAY=-1' : 'FREQ=YEARLY',
      summary: `🎂 Anniversaire de ${p.name}`,
      description: born,
      hour,
    });
  }
  for (const n of p.reminders) {
    events.push({
      uid: `${p.id}-r${n}@anniversaires`,
      date: new Date(day.getFullYear(), day.getMonth(), day.getDate() - n),
      rrule: 'FREQ=YEARLY',
      summary: `🔔 Anniversaire de ${p.name} ${n === 1 ? 'demain' : `dans ${daysBeforeLabel(n).replace(' avant', '')}`}`,
      description: `Le ${formatBirthday(p.birthday, false)}${born ? ` · ${born}` : ''}`,
      hour,
    });
  }
  return events;
}

function toIcs(events: CalEvent[]): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Anniversaires//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...events.flatMap(vevent),
    'END:VCALENDAR',
  ];
  return lines.join('\r\n') + '\r\n';
}

// --- Ce qui a déjà été envoyé au Calendrier (noté sur le téléphone) ---
// Le Calendrier ne peut pas être modifié depuis l'app : on n'envoie que ce qui manque,
// et on liste ce que l'utilisateur doit supprimer lui-même (personne supprimée, rappel retiré ou modifié).

const SENT_KEY = 'anniv.calendar.sent';

interface SentEvent {
  /** empreinte de l'événement : si elle change, l'ancien événement n'est plus bon */
  sig: string;
  summary: string;
}

// sans l'année : un événement envoyé reste valable d'une année sur l'autre
const signature = (e: CalEvent) => [ymd(e.date).slice(4), e.rrule, e.summary, e.description ?? '', e.hour].join('|');

function readSent(): Record<string, SentEvent> {
  try {
    return JSON.parse(localStorage.getItem(SENT_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function markAllSent(events: CalEvent[]): void {
  localStorage.setItem(SENT_KEY, JSON.stringify(Object.fromEntries(events.map((e) => [e.uid, { sig: signature(e), summary: e.summary }]))));
}

export interface CalendarStatus {
  /** nombre d'événements à ajouter au Calendrier */
  toSend: number;
  /** titres des événements déjà dans le Calendrier qui ne sont plus bons */
  toRemove: string[];
}

export function calendarStatus(people: Person[], hour: number): CalendarStatus {
  const sent = readSent();
  const current = people.flatMap((p) => eventsFor(p, hour));
  const byUid = new Map(current.map((e) => [e.uid, e]));
  return {
    toSend: current.filter((e) => sent[e.uid]?.sig !== signature(e)).length,
    toRemove: Object.entries(sent)
      .filter(([uid, s]) => {
        const e = byUid.get(uid);
        return !e || signature(e) !== s.sig;
      })
      .map(([, s]) => s.summary),
  };
}

/** Envoie au Calendrier tout ce qui manque ; renvoie les anciens événements à supprimer à la main */
export async function sendToCalendar(people: Person[], hour: number): Promise<string[]> {
  const sent = readSent();
  const current = people.flatMap((p) => eventsFor(p, hour));
  const { toRemove } = calendarStatus(people, hour);
  const missing = current.filter((e) => sent[e.uid]?.sig !== signature(e));
  markAllSent(current);
  if (missing.length) await openCalendar(toIcs(missing), 'anniversaires.ics');
  return toRemove;
}

/** Renvoie absolument tout (si les anniversaires ont été effacés du Calendrier, par exemple) */
export async function resendAllToCalendar(people: Person[], hour: number): Promise<void> {
  const current = people.flatMap((p) => eventsFor(p, hour));
  markAllSent(current);
  if (current.length) await openCalendar(toIcs(current), 'anniversaires.ics');
}

const CALENDAR_CACHE = 'anniv-calendar';

/**
 * Ouvre le fichier pour le Calendrier : sur iPhone, une fenêtre propose de l'ajouter.
 * Il est servi par le service worker (vraie adresse + bon format), ce qui marche aussi sans internet.
 */
async function openCalendar(content: string, fileName: string): Promise<void> {
  if (navigator.serviceWorker?.controller && 'caches' in window) {
    const url = new URL('./calendrier.ics', location.href).href;
    const cache = await caches.open(CALENDAR_CACHE);
    await cache.put(url, new Response(content, { headers: { 'Content-Type': 'text/calendar; charset=utf-8' } }));
    location.assign(`${url}?t=${Date.now()}`);
    return;
  }
  // sans service worker (en développement) : lien direct vers le contenu
  const a = document.createElement('a');
  a.href = `data:text/calendar;charset=utf-8,${encodeURIComponent(content)}`;
  // sur ordinateur, on télécharge le fichier ; sur iPhone, l'ouvrir suffit
  if (!/iPhone|iPad|iPod/.test(navigator.userAgent)) a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
