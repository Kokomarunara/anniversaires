import { useEffect, useRef, useState, type PointerEvent } from 'react';

const SIZE = 512;
const COLORS = ['#121212', '#ffffff', '#1e40e6', '#2f9e52', '#ffcf33', '#ff6a2b', '#f6a9c9', '#e0262f', '#8a5a3c', '#f1c7a5', '#7d4fd6', '#7fd3f7'];
const BRUSHES = [6, 14, 28, 48];
const MAX_UNDO = 25;

type Tool = 'brush' | 'fill' | 'eraser';

interface Props {
  /** image de départ (photo actuelle), sinon page blanche */
  startFrom?: string | null;
  onCancel: () => void;
  onDone: (drawing: Blob) => void;
  /** affiché comme aperçu sur la page de présentation : ne bloque pas le défilement */
  embedded?: boolean;
}

export function DrawPad({ startFrom, onCancel, onDone, embedded }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [color, setColor] = useState(COLORS[2]);
  const [brush, setBrush] = useState(BRUSHES[1]);
  const [tool, setTool] = useState<Tool>('brush');
  const [canUndo, setCanUndo] = useState(false);
  const undo = useRef<ImageData[]>([]);
  const last = useRef<{ x: number; y: number } | null>(null);

  const ctx = () => canvasRef.current!.getContext('2d', { willReadFrequently: true })!;

  useEffect(() => {
    const c = ctx();
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, SIZE, SIZE);
    if (!startFrom) return;
    const img = new Image();
    img.onload = () => {
      const side = Math.min(img.width, img.height);
      c.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, SIZE, SIZE);
    };
    img.src = startFrom;
  }, [startFrom]);

  // empêche la page de défiler pendant qu'on dessine sur iPhone
  useEffect(() => {
    if (embedded) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [embedded]);

  function snapshot() {
    undo.current.push(ctx().getImageData(0, 0, SIZE, SIZE));
    if (undo.current.length > MAX_UNDO) undo.current.shift();
    setCanUndo(true);
  }

  function point(e: PointerEvent<HTMLCanvasElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * SIZE, y: ((e.clientY - r.top) / r.height) * SIZE };
  }

  function stroke(from: { x: number; y: number }, to: { x: number; y: number }) {
    const c = ctx();
    c.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
    c.lineWidth = brush;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.beginPath();
    c.moveTo(from.x, from.y);
    c.lineTo(to.x, to.y);
    c.stroke();
  }

  function down(e: PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    snapshot();
    const p = point(e);
    if (tool === 'fill') {
      floodFill(ctx(), Math.floor(p.x), Math.floor(p.y), color);
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    last.current = p;
    stroke(p, p);
  }

  function move(e: PointerEvent<HTMLCanvasElement>) {
    if (!last.current) return;
    for (const ev of e.nativeEvent.getCoalescedEvents?.() ?? [e.nativeEvent]) {
      const r = e.currentTarget.getBoundingClientRect();
      const p = { x: ((ev.clientX - r.left) / r.width) * SIZE, y: ((ev.clientY - r.top) / r.height) * SIZE };
      stroke(last.current, p);
      last.current = p;
    }
  }

  function up() {
    last.current = null;
  }

  function undoLast() {
    const img = undo.current.pop();
    if (img) ctx().putImageData(img, 0, 0);
    setCanUndo(undo.current.length > 0);
  }

  function clear() {
    snapshot();
    const c = ctx();
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, SIZE, SIZE);
  }

  function done() {
    canvasRef.current!.toBlob((b) => b && onDone(b), 'image/jpeg', 0.9);
  }

  return (
    <div className="drawpad" role="dialog" aria-modal="true" aria-label="Dessiner la photo de profil">
      <header className="drawpad-bar">
        <button type="button" className="nav-btn" onClick={onCancel}>
          Annuler
        </button>
        <span className="nav-title">Dessine !</span>
        <button type="button" className="nav-btn nav-bold" onClick={done}>
          Utiliser
        </button>
      </header>

      <div className="drawpad-canvas-wrap">
        <canvas
          ref={canvasRef}
          width={SIZE}
          height={SIZE}
          className={`drawpad-canvas tool-${tool}`}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
        />
        {/* repère : seul l'intérieur du cercle sera visible dans l'icône de la personne */}
        <div className="drawpad-guide" aria-hidden="true" />
      </div>

      <div className="drawpad-tools">
        <div className="tool-row" role="radiogroup" aria-label="Outil">
          {(
            [
              ['brush', 'Pinceau', '🖌️'],
              ['fill', 'Remplir', '🪣'],
              ['eraser', 'Gomme', '🧽'],
            ] as const
          ).map(([t, label, emoji]) => (
            <button key={t} type="button" role="radio" aria-checked={tool === t} className={`tool${tool === t ? ' active' : ''}`} onClick={() => setTool(t)}>
              <span aria-hidden="true">{emoji}</span>
              {label}
            </button>
          ))}
        </div>

        <div className="tool-row" role="radiogroup" aria-label="Taille du pinceau">
          {BRUSHES.map((b) => (
            <button
              key={b}
              type="button"
              role="radio"
              aria-checked={brush === b}
              aria-label={`Taille ${b}`}
              className={`brush${brush === b ? ' active' : ''}`}
              onClick={() => {
                setBrush(b);
                if (tool === 'fill') setTool('brush');
              }}
            >
              <span style={{ width: 4 + b / 2.2, height: 4 + b / 2.2, background: tool === 'eraser' ? '#bbb' : color }} />
            </button>
          ))}
          <span className="tool-spacer" />
          <button type="button" className="brush" onClick={undoLast} disabled={!canUndo} aria-label="Annuler le dernier trait" title="Annuler le dernier trait">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 14 4 9l5-5" />
              <path d="M4 9h10a6 6 0 0 1 0 12h-3" />
            </svg>
          </button>
          <button type="button" className="brush" onClick={clear} aria-label="Tout effacer" title="Tout effacer">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
            </svg>
          </button>
        </div>

        <div className="swatches" role="radiogroup" aria-label="Couleur">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={color === c}
              aria-label={`Couleur ${c}`}
              className={`swatch${color === c ? ' active' : ''}`}
              style={{ background: c }}
              onClick={() => {
                setColor(c);
                if (tool === 'eraser') setTool('brush');
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Remplit la zone de couleur proche autour du point touché */
function floodFill(c: CanvasRenderingContext2D, x: number, y: number, hex: string) {
  const img = c.getImageData(0, 0, SIZE, SIZE);
  const d = img.data;
  const at = (x + y * SIZE) * 4;
  const target = [d[at], d[at + 1], d[at + 2]];
  const fill = [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
  const tolerance = 48;
  const matches = (i: number) =>
    Math.abs(d[i] - target[0]) + Math.abs(d[i + 1] - target[1]) + Math.abs(d[i + 2] - target[2]) <= tolerance;
  if (Math.abs(fill[0] - target[0]) + Math.abs(fill[1] - target[1]) + Math.abs(fill[2] - target[2]) === 0) return;

  const seen = new Uint8Array(SIZE * SIZE);
  const stack = [x + y * SIZE];
  while (stack.length) {
    const p = stack.pop()!;
    if (seen[p]) continue;
    seen[p] = 1;
    const i = p * 4;
    if (!matches(i)) continue;
    d[i] = fill[0];
    d[i + 1] = fill[1];
    d[i + 2] = fill[2];
    d[i + 3] = 255;
    const px = p % SIZE;
    if (px > 0) stack.push(p - 1);
    if (px < SIZE - 1) stack.push(p + 1);
    if (p >= SIZE) stack.push(p - SIZE);
    if (p < SIZE * (SIZE - 1)) stack.push(p + SIZE);
  }
  c.putImageData(img, 0, 0);
}
