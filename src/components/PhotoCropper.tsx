import { useEffect, useRef, useState, type PointerEvent, type WheelEvent } from 'react';

const OUT = 512;
const MAX_ZOOM = 4;

interface Props {
  /** URL de l'image à recadrer */
  src: string;
  onCancel: () => void;
  onDone: (photo: Blob) => void;
}

interface View {
  /** zoom au-dessus du cadrage minimal (1 = l'image remplit juste le cercle) */
  zoom: number;
  /** position du coin haut-gauche de l'image dans le cadre, en px */
  x: number;
  y: number;
}

/** Recadrage d'une photo dans le cercle : on la fait glisser et on zoome (pincer ou curseur) */
export function PhotoCropper({ src, onCancel, onDone }: Props) {
  const frameRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [frame, setFrame] = useState(300);
  const [view, setView] = useState<View>({ zoom: 1, x: 0, y: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);

  useEffect(() => {
    const el = frameRef.current!;
    const measure = () => setFrame(el.clientWidth);
    measure();
    addEventListener('resize', measure);
    document.body.style.overflow = 'hidden';
    return () => {
      removeEventListener('resize', measure);
      document.body.style.overflow = '';
    };
  }, []);

  const base = natural ? frame / Math.min(natural.w, natural.h) : 1;
  const scale = base * view.zoom;

  /** garde l'image collée aux bords du cadre : jamais de vide dans le cercle */
  function clamp(v: View): View {
    if (!natural) return v;
    const s = base * v.zoom;
    const minX = frame - natural.w * s;
    const minY = frame - natural.h * s;
    return { zoom: v.zoom, x: Math.min(0, Math.max(minX, v.x)), y: Math.min(0, Math.max(minY, v.y)) };
  }

  // au chargement (ou si le cadre change de taille) : image centrée
  useEffect(() => {
    if (!natural) return;
    const s = base;
    setView({ zoom: 1, x: (frame - natural.w * s) / 2, y: (frame - natural.h * s) / 2 });
  }, [natural, frame]);

  /** zoom autour d'un point du cadre (le point sous les doigts ne bouge pas) */
  function zoomAt(zoom: number, cx = frame / 2, cy = frame / 2) {
    setView((v) => {
      const z = Math.min(MAX_ZOOM, Math.max(1, zoom));
      const ratio = z / v.zoom;
      return clamp({ zoom: z, x: cx - (cx - v.x) * ratio, y: cy - (cy - v.y) * ratio });
    });
  }

  function local(e: PointerEvent) {
    const r = frameRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function down(e: PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, local(e));
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom: view.zoom };
    }
  }

  function move(e: PointerEvent<HTMLDivElement>) {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const p = local(e);
    pointers.current.set(e.pointerId, p);
    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      zoomAt(pinch.current.zoom * (dist / pinch.current.dist), (a.x + b.x) / 2, (a.y + b.y) / 2);
    } else if (pointers.current.size === 1) {
      setView((v) => clamp({ ...v, x: v.x + p.x - prev.x, y: v.y + p.y - prev.y }));
    }
  }

  function up(e: PointerEvent<HTMLDivElement>) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  }

  function wheel(e: WheelEvent<HTMLDivElement>) {
    const r = frameRef.current!.getBoundingClientRect();
    zoomAt(view.zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX - r.left, e.clientY - r.top);
  }

  function done() {
    const img = imgRef.current;
    if (!img || !natural) return;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = OUT;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, OUT, OUT);
    ctx.drawImage(img, -view.x / scale, -view.y / scale, frame / scale, frame / scale, 0, 0, OUT, OUT);
    canvas.toBlob((b) => b && onDone(b), 'image/jpeg', 0.85);
  }

  return (
    <div className="cropper" role="dialog" aria-modal="true" aria-label="Recadrer la photo">
      <header className="drawpad-bar">
        <button type="button" className="nav-btn" onClick={onCancel}>
          Annuler
        </button>
        <span className="nav-title">Recadrer</span>
        <button type="button" className="nav-btn nav-bold" onClick={done} disabled={!natural}>
          Valider
        </button>
      </header>

      <div
        ref={frameRef}
        className="cropper-frame"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onWheel={wheel}
      >
        <img
          ref={imgRef}
          src={src}
          alt=""
          draggable={false}
          onLoad={(e) => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${scale})`, opacity: natural ? 1 : 0 }}
        />
        <div className="cropper-mask" aria-hidden="true" />
      </div>

      <p className="cropper-hint">Fais glisser la photo et pince pour zoomer.</p>

      <div className="cropper-zoom">
        <span aria-hidden="true">−</span>
        <input
          type="range"
          min={1}
          max={MAX_ZOOM}
          step={0.01}
          value={view.zoom}
          aria-label="Zoom"
          onChange={(e) => zoomAt(Number(e.target.value))}
        />
        <span aria-hidden="true">+</span>
      </div>
    </div>
  );
}
