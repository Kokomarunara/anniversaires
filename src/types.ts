export type Gender = 'M' | 'F';

export interface Person {
  id: string;
  name: string;
  gender: Gender;
  /** "1990-05-14", ou "--05-14" quand l'année est inconnue */
  birthday: string;
  /** chemin de la photo dans le stockage, ou null pour l'icône H/F */
  photo: string | null;
  notes: string;
  /** notification le jour de l'anniversaire */
  remindOnDay: boolean;
  /** rappels en plus, en nombre de jours avant l'anniversaire (chaque année) */
  reminders: number[];
}

/** Complète une fiche enregistrée par une ancienne version de l'app */
export function normalizePerson(p: Person & { remindDaysBefore?: number | null }): Person {
  const { remindDaysBefore, ...rest } = p;
  return {
    ...rest,
    remindOnDay: p.remindOnDay ?? true,
    reminders: p.reminders ?? (remindDaysBefore ? [remindDaysBefore] : []),
  };
}

export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
