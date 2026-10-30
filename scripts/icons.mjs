// Génère les icônes PNG de l'app à partir d'un dessin SVG : npm run icons
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

// Un personnage jaune avec un chapeau de fête, sur fond bleu
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#1e40e6"/>
  <circle cx="92" cy="430" r="70" fill="#2f9e52"/>
  <circle cx="452" cy="96" r="44" fill="#f6a9c9"/>
  <path d="M262 122c66 0 108 28 124 74s38 66 26 112-50 92-120 94-128-10-160-52-30-98-10-140 74-88 140-88z" fill="#ffcf33"/>
  <path d="M236 132 286 24l52 104z" fill="#ff6a2b" stroke="#121212" stroke-width="12" stroke-linejoin="round"/>
  <circle cx="286" cy="24" r="20" fill="#f6a9c9" stroke="#121212" stroke-width="10"/>
  <ellipse cx="214" cy="246" rx="40" ry="46" fill="#fff" stroke="#121212" stroke-width="12"/>
  <ellipse cx="322" cy="246" rx="40" ry="46" fill="#fff" stroke="#121212" stroke-width="12"/>
  <circle cx="226" cy="254" r="19" fill="#121212"/>
  <circle cx="334" cy="254" r="19" fill="#121212"/>
  <path d="M220 330q48 44 96 0" fill="none" stroke="#121212" stroke-width="14" stroke-linecap="round"/>
</svg>`;

await mkdir('public/icons', { recursive: true });
const sizes = { 'icon-192.png': 192, 'icon-512.png': 512, 'apple-touch-icon.png': 180 };
for (const [file, size] of Object.entries(sizes)) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(`public/icons/${file}`);
}
console.log('Icônes générées dans public/icons');
