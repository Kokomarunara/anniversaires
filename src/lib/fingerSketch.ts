// Une tête dessinée « au doigt » pour l'aperçu de l'outil de dessin :
// traits tremblants, un peu de travers, comme sur un téléphone.

type Pt = [number, number];

// hasard reproductible : le dessin est le même à chaque affichage
function random(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
}

let rnd = random(42);
const wobble = (amount: number) => (rnd() - 0.5) * 2 * amount;

/** points d'un ovale bosselé, qui ne se referme pas tout à fait */
function wobblyOval(cx: number, cy: number, rx: number, ry: number, jitter: number, turns = 1.06): Pt[] {
  const pts: Pt[] = [];
  const steps = 48;
  const start = rnd() * Math.PI;
  for (let i = 0; i <= steps * turns; i++) {
    const a = start + (i / steps) * Math.PI * 2;
    const r = 1 + wobble(jitter);
    pts.push([cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r]);
  }
  return pts;
}

function stroke(c: CanvasRenderingContext2D, pts: Pt[], color: string, width: number) {
  c.strokeStyle = color;
  c.lineWidth = width;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.beginPath();
  c.moveTo(pts[0][0], pts[0][1]);
  // courbes lissées entre les points, comme un doigt qui glisse
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2;
    const my = (pts[i][1] + pts[i + 1][1]) / 2;
    c.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
  }
  const last = pts[pts.length - 1];
  c.lineTo(last[0], last[1]);
  c.stroke();
}

function fill(c: CanvasRenderingContext2D, pts: Pt[], color: string) {
  c.fillStyle = color;
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
  c.fill();
}

/** ligne tremblante d'un point à un autre */
function line(from: Pt, to: Pt, bend: number, jitter: number): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    const arc = Math.sin(t * Math.PI) * bend;
    pts.push([from[0] + (to[0] - from[0]) * t + wobble(jitter), from[1] + (to[1] - from[1]) * t - arc + wobble(jitter)]);
  }
  return pts;
}

export function drawFingerHead(c: CanvasRenderingContext2D): void {
  rnd = random(42);
  const ink = '#2b2b2b';

  // fond : coup de pinceau bleu ciel en zigzag, pas tout à fait jusqu'aux bords
  for (let y = 40; y < 470; y += 34) {
    stroke(c, line([30 + wobble(10), y], [482 + wobble(10), y + wobble(8)], wobble(6), 4), '#bfe6fb', 40);
  }

  // visage : rempli de couleur peau (débordement compris), puis le contour décalé
  const face = wobblyOval(258, 282, 150, 168, 0.035);
  fill(c, face, '#f1c7a5');
  stroke(c, wobblyOval(252, 278, 152, 172, 0.04, 1.1), ink, 12);

  // oreilles
  stroke(c, wobblyOval(100, 290, 26, 40, 0.12, 0.8), ink, 10);
  stroke(c, wobblyOval(410, 284, 24, 38, 0.12, 0.8), ink, 10);

  // cheveux : gribouillis marron en boucles sur le haut du crâne
  const hair: Pt[] = [];
  for (let i = 0; i <= 26; i++) {
    const t = i / 26;
    const a = Math.PI * (1.08 + t * 0.84);
    const loop = i % 2 ? 26 : -10;
    hair.push([258 + Math.cos(a) * (150 + loop) + wobble(8), 270 + Math.sin(a) * (175 + loop) + wobble(8)]);
  }
  stroke(c, hair, '#8a5a3c', 30);

  // yeux : un plus gros que l'autre, avec un reflet raté
  fill(c, wobblyOval(198, 262, 22, 26, 0.15), ink);
  fill(c, wobblyOval(314, 256, 18, 24, 0.15), ink);
  fill(c, wobblyOval(192, 254, 6, 6, 0.2), '#ffffff');
  fill(c, wobblyOval(309, 249, 5, 5, 0.2), '#ffffff');

  // sourcils
  stroke(c, line([168, 216], [228, 208], 8, 3), ink, 9);
  stroke(c, line([288, 204], [344, 214], 10, 3), ink, 9);

  // nez en crochet
  stroke(c, [[258, 284], [248, 318], [262, 326], [272, 322]], ink, 9);

  // joues roses
  fill(c, wobblyOval(165, 336, 30, 20, 0.15), '#f6a9c9');
  fill(c, wobblyOval(352, 330, 28, 19, 0.15), '#f6a9c9');

  // grand sourire rouge un peu de travers
  stroke(c, line([194, 360], [326, 352], -52, 3), '#e0262f', 14);
}
