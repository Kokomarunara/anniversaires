import type { Person } from './types';

// Données fictives pour essayer le mode démo, avec des dates proches d'aujourd'hui
function inDays(days: number, year: number | null): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${year ?? '-'}-${mm}-${dd}`;
}

const sample = (id: string, name: string, gender: Person['gender'], birthday: string, notes = '', reminders: number[] = []): Person => ({
  id: `exemple-${id}`,
  name,
  gender,
  birthday,
  photo: null,
  notes,
  remindOnDay: true,
  reminders,
});

export const EXAMPLES: Person[] = [
  sample('1', 'Camille', 'F', inDays(0, 1994), 'Adore le thé matcha et les plantes grasses.'),
  sample('2', 'Hugo', 'M', inDays(3, 1990), 'Fan de vélo. Taille M.', [7]),
  sample('3', 'Léa', 'F', inDays(12, null)),
  sample('4', 'Maman', 'F', inDays(40, 1965), 'Parfum : quelque chose de frais.', [14, 2]),
  sample('5', 'Thomas', 'M', inDays(95, 1988)),
  sample('6', 'Inès', 'F', inDays(200, 2001)),
];
