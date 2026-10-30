// Palette des personnages, inspirée d'affiches colorées
export const PALETTE = ['#2f9e52', '#ffcf33', '#ff6a2b', '#f6a9c9', '#1e40e6'] as const;

export function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Couleur fixe d'une personne, tirée de son id */
export function colorFor(id: string): string {
  return PALETTE[hash(id) % PALETTE.length];
}

/** Texte lisible posé sur cette couleur */
export function inkOn(color: string): string {
  return color === '#1e40e6' || color === '#2f9e52' ? '#ffffff' : '#121212';
}
