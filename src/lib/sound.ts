// Petits sons synthétisés à la volée (aucun fichier audio) : bulles et notes de marimba.
// Sur iPhone, ils respectent le bouton silencieux.

const KEY = 'anniv.sound';
let ctx: AudioContext | null = null;
let enabled = true;
try {
  enabled = localStorage.getItem(KEY) !== 'off';
} catch {
  /* stockage indisponible : sons activés */
}

export function soundEnabled(): boolean {
  return enabled;
}

export function setSoundEnabled(on: boolean): void {
  enabled = on;
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    /* tant pis, le choix ne sera pas retenu */
  }
}

function audio(): AudioContext | null {
  if (!enabled) return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

interface Note {
  freq: number;
  /** fréquence d'arrivée, pour un glissando */
  to?: number;
  at?: number;
  dur?: number;
  gain?: number;
  type?: OscillatorType;
}

function play(notes: Note[]) {
  const ac = audio();
  if (!ac) return;
  const now = ac.currentTime + 0.005;
  for (const { freq, to, at = 0, dur = 0.12, gain = 0.06, type = 'sine' } of notes) {
    const t = now + at;
    const osc = ac.createOscillator();
    const env = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur * 0.8);
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(gain, t + 0.006);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(env).connect(ac.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }
}

// note de marimba : fondamentale + une harmonique aiguë qui s'éteint vite
const marimba = (freq: number, at = 0, gain = 0.07): Note[] => [
  { freq, at, dur: 0.22, gain, type: 'sine' },
  { freq: freq * 4, at, dur: 0.05, gain: gain * 0.25, type: 'sine' },
];

export const sound = {
  /** petite bulle à chaque appui */
  tap: () => play([{ freq: 900, to: 520, dur: 0.07, gain: 0.045 }]),
  /** on ouvre une page : « plop » de bouchon qui monte */
  forward: () => play([{ freq: 180, to: 720, dur: 0.09, gain: 0.12 }]),
  /** bouton + : deux plops qui montent, pour fêter l'arrivée de quelqu'un */
  add: () =>
    play([
      { freq: 180, to: 720, dur: 0.09, gain: 0.12 },
      { freq: 260, to: 1040, at: 0.09, dur: 0.09, gain: 0.11 },
    ]),
  /** retour : le même « plop », qui redescend */
  back: () => play([{ freq: 620, to: 160, dur: 0.1, gain: 0.11 }]),
  /** enregistré : petit arpège joyeux */
  success: () => play([...marimba(1047, 0, 0.05), ...marimba(1319, 0.07, 0.05), ...marimba(1568, 0.14, 0.06)]),
  /** supprimé : « bloup » qui descend */
  remove: () => play([{ freq: 420, to: 110, dur: 0.26, gain: 0.08, type: 'triangle' }]),
  /** erreur : deux notes graves et douces */
  error: () => play([...marimba(330, 0, 0.06), ...marimba(262, 0.11, 0.06)]),
  /** c'est l'anniversaire aujourd'hui ! */
  party: () =>
    play([523, 659, 784, 1047, 784, 1047].flatMap((f, i) => marimba(f, i * 0.085, 0.055))),
};

/** Bulle discrète sur tout ce qui se touche (boutons, listes, choix) ; les éléments data-nav ont déjà leur son de page */
export function installTapSounds(): void {
  document.addEventListener(
    'pointerdown',
    (e) => {
      const el = (e.target as Element).closest('button, select, [role="radio"]');
      if (el && !(el as HTMLButtonElement).disabled && !el.hasAttribute('data-nav')) sound.tap();
    },
    { passive: true },
  );
}
