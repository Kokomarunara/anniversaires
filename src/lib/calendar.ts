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

export function buildCalendar(people: Person[], hour: number): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Anniversaires//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...people.flatMap((p) => eventsFor(p, hour).flatMap(vevent)),
    'END:VCALENDAR',
  ];
  return lines.join('\r\n') + '\r\n';
}

/** Nombre d'événements qu'un export va créer (pour le message de confirmation) */
export function countEvents(people: Person[]): number {
  return people.reduce((n, p) => n + (p.remindOnDay ? 1 : 0) + p.reminders.length, 0);
}

/** Ouvre le fichier : sur iPhone, le Calendrier propose « Tout ajouter » */
export function openCalendar(content: string, fileName: string): void {
  const a = document.createElement('a');
  a.href = `data:text/calendar;charset=utf-8,${encodeURIComponent(content)}`;
  // sur ordinateur, on télécharge le fichier ; sur iPhone, l'ouvrir suffit
  if (!/iPhone|iPad|iPod/.test(navigator.userAgent)) a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
