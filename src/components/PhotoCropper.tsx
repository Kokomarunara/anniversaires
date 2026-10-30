import { useEffect, useRef, useState, type PointerEvent, type WheelEvent } from 'react';

const OUT = 512;
/** le plus petit cercle, en part du plus petit côté de la photo */
const MIN_SIZE = 0.15;

interface Props {
  /** URL de l'image à recadrer */
  src: string;
  onCancel: () => void;
  onDone: (photo: Blob) => void;
}

interface Circle {
  /** centre et rayon, en px dans la photo affichée */
  x: number;
  y: number;
  r: number;
}

/** Recadrage : la photo entière est affichée, on déplace le cercle n'importe où dessus et on règle sa taille */
export function PhotoCropper({ src, onCancel, onDone }: Props) {
  const areaRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [area, setArea] = useState(300);
  const [circle, setCircle] = useState<Circle | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; r: number } | null>(null);

  useEffect(() => {
    const el = areaRef.current!;
    const measure = () => setArea(el.clientWidth);
    measure();
    addEventListener('resize', measure);
    document.body.style.overflow = 'hidden';
    return () => {
      removeEventListener('resize', measure);
      document.body.style.overflow = '';
    };
  }, []);

  // la photo entière tient dans le carré
  const fit = natural ? area / Math.max(natural.w, natural.h) : 1;
  const dw = natural ? natural.w * fit : area;
  const dh = natural ? natural.h * fit : area;
  const maxR = Math.min(dw, dh) / 2;
  const minR = maxR * MIN_SIZE * 2;

  /** le cercle reste entièrement sur la photo */
  function clamp(c: Circle): Circle {
    const r = Math.min(maxR, Math.max(minR, c.r));
    return { r, x: Math.min(dw - r, Math.max(r, c.x)), y: Math.min(dh - r, Math.max(r, c.y)) };
  }

  // au départ : le plus grand cercle possible, au centre
  useEffect(() => {
    if (natural) setCircle({ x: dw / 2, y: dh / 2, r: maxR });
  }, [natural, area]);

  function local(e: PointerEvent) {
    const rect = areaRef.current!.getBoundingClientRect();
    // coordonnées dans la photo affichée (centrée dans le carré)
    return { x: e.clientX - rect.left - (area - dw) / 2, y: e.clientY - rect.top - (area - dh) / 2 };
  }

  function down(e: PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, local(e));
    if (pointers.current.size === 2 && circle) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), r: circle.r };
    }
  }

  function move(e: PointerEvent<HTMLDivElement>) {
    const prev = pointers.current.get(e.pointerId);
    if (!prev || !circle) return;
    const p = local(e);
    pointers.current.set(e.pointerId, p);
    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const r = pinch.current.r * (Math.hypot(a.x - b.x, a.y - b.y) / pinch.current.dist);
      setCircle((c) => c && clamp({ ...c, r }));
    } else if (pointers.current.size === 1) {
      // le cercle suit le doigt
      setCircle((c) => c && clamp({ ...c, x: c.x + p.x - prev.x, y: c.y + p.y - prev.y }));
    }
  }

  function up(e: PointerEvent<HTMLDivElement>) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  }

  function wheel(e: WheelEvent<HTMLDivElement>) {
    setCircle((c) => c && clamp({ ...c, r: c.r * (e.deltaY < 0 ? 1.08 : 1 / 1.08) }));
  }

  function done() {
    const img = imgRef.current;
    if (!img || !natural || !circle) return;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = OUT;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, OUT, OUT);
    const side = (circle.r * 2) / fit;
    ctx.drawImage(img, (circle.x - circle.r) / fit, (circle.y - circle.r) / fit, side, side, 0, 0, OUT, OUT);
    canvas.toBlob((b) => b && onDone(b), 'image/jpeg', 0.85);
  }

  // curseur de taille : 0 = petit cercle, 1 = le plus grand possible
  const size = circle ? (circle.r - minR) / (maxR - minR || 1) : 1;

  return (
    <div className="cropper" role="dialog" aria-modal="true" aria-label="Recadrer la photo">
      <header className="drawpad-bar">
        <button type="button" className="nav-btn" onClick={onCancel}>
          Annuler
        </button>
        <span className="nav-title">Recadrer</span>
        <button type="button" className="nav-btn nav-bold" onClick={done} disabled={!circle}>
          Valider
        </button>
      </header>

      <div
        ref={areaRef}
        className="cropper-area"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onWheel={wheel}
      >
        <div className="cropper-photo" style={{ width: dw, height: dh }}>
          <img
            ref={imgRef}
            src={src}
            alt=""
            draggable={false}
            onLoad={(e) => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
            style={{ opacity: natural ? 1 : 0 }}
          />
          {circle && (
            <div
              className="cropper-circle"
              aria-hidden="true"
              style={{ left: circle.x - circle.r, top: circle.y - circle.r, width: circle.r * 2, height: circle.r * 2 }}
            />
          )}
        </div>
      </div>

      <p className="cropper-hint">Déplace le cercle sur la photo, pince pour changer sa taille.</p>

      <div className="cropper-zoom">
        <span aria-hidden="true" className="cropper-dot small" />
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={size}
          aria-label="Taille du cercle"
          onChange={(e) => setCircle((c) => c && clamp({ ...c, r: minR + Number(e.target.value) * (maxR - minR) }))}
        />
        <span aria-hidden="true" className="cropper-dot" />
      </div>
    </div>
  );
}
