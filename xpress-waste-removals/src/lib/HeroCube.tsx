import { useEffect, useRef } from 'react';

const FACES = [
  { k: 'f1', slug: 'house-clearance', label: 'House clearance', d: 'M3 11l9-8 9 8M5 10v10h14V10M10 20v-6h4v6' },
  { k: 'f2', slug: 'garden-waste-removal', label: 'Garden waste', d: 'M11 20A7 7 0 0 1 4 13c0-5 5-9 16-9 0 11-4 16-9 16zM4 20c3-6 6-9 11-11' },
  { k: 'f3', slug: 'furniture-appliance-removal', label: 'Furniture removal', d: 'M4 11V8a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v3M2 13a2 2 0 0 1 4 0v2h12v-2a2 2 0 0 1 4 0v5H2zM5 18v2M19 18v2' },
  { k: 'f4', slug: 'office-commercial-clearance', label: 'Office clearance', d: 'M4 21V4h10v17M14 9h6v12M2 21h20M8 8h2M8 12h2M8 16h2' },
  { k: 'f5', slug: 'moving-service', label: 'Moving help', d: 'M1 6h13v10H1zM14 9h5l3 3v4h-8zM6 19a2 2 0 1 0 0-.01M18 19a2 2 0 1 0 0-.01' },
  { k: 'f6', slug: 'recycling-responsible-disposal', label: 'Recycling', d: 'M7 19l-3-5 3-5M7 9l3-5h4M17 5l3 5-3 5M17 15l-3 5H9M12 2l2 2-2 2M12 22l-2-2 2-2' },
];

/** Decorative-but-draggable 3D services cube for the home hero. Drag with mouse or swipe sideways on touch. */
export function HeroCube({ onOpen }: { onOpen?: (slug: string) => void }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  const openRef = useRef(onOpen);
  openRef.current = onOpen;

  useEffect(() => {
    const host = hostRef.current;
    const drag = dragRef.current;
    const tilt = tiltRef.current;
    if (!host || !drag || !tilt) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let rx = 0, ry = 0, lx = 0, ly = 0, raf = 0, down = false;
    // double-click / double-tap on a face opens that service page
    let downSlug = '', sx = 0, sy = 0, lastSlug = '', lastT = 0;

    const apply = () => { raf = 0; drag.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`; };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(apply); };

    const onDown = (e: PointerEvent) => {
      down = true; lx = e.clientX; ly = e.clientY; sx = e.clientX; sy = e.clientY;
      downSlug = (e.target as HTMLElement).closest<HTMLElement>('[data-slug]')?.dataset.slug ?? '';
      try { host.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      host.classList.add('is-drag');
    };
    const onMove = (e: PointerEvent) => {
      if (down) {
        ry += (e.clientX - lx) * 0.5;
        rx = Math.max(-60, Math.min(60, rx - (e.clientY - ly) * 0.5));
        lx = e.clientX; ly = e.clientY;
        schedule();
        return;
      }
      if (e.pointerType === 'touch' || reduced) return;
      const r = host.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width - 0.5) * 2;
      const y = ((e.clientY - r.top) / r.height - 0.5) * 2;
      tilt.style.transform = `rotateX(${-y * 8}deg) rotateY(${x * 12}deg)`;
    };
    const onUp = (e: PointerEvent) => {
      const wasDown = down;
      down = false; host.classList.remove('is-drag');
      if (!wasDown || e.type !== 'pointerup' || !downSlug) return;
      if (Math.hypot(e.clientX - sx, e.clientY - sy) > 8) { lastSlug = ''; return; } // it was a drag, not a tap
      const now = Date.now();
      if (lastSlug === downSlug && now - lastT < 400) { lastSlug = ''; openRef.current?.(downSlug); }
      else { lastSlug = downSlug; lastT = now; }
    };
    const onLeave = () => { if (!down) tilt.style.transform = ''; };

    host.addEventListener('pointerdown', onDown);
    host.addEventListener('pointermove', onMove);
    host.addEventListener('pointerup', onUp);
    host.addEventListener('pointercancel', onUp);
    host.addEventListener('pointerleave', onLeave);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      host.removeEventListener('pointerdown', onDown);
      host.removeEventListener('pointermove', onMove);
      host.removeEventListener('pointerup', onUp);
      host.removeEventListener('pointercancel', onUp);
      host.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return (
    <div ref={hostRef} className="hx-cube-stage" aria-hidden="true">
      <div className="hc-shadow" />
      <div className="hc-ring" />
      <div className="hc-world">
        <div ref={tiltRef} className="hc-tilt">
          <div ref={dragRef} className="hc-drag">
            <div className="hc-spin">
              {FACES.map((f) => (
                <div key={f.k} data-slug={f.slug} title="Double-click to open" className={`hc-face ${f.k}`}>
                  <svg viewBox="0 0 24 24" fill="none" stroke={f.k === 'f6' ? '#86efac' : '#bae6fd'} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={f.d} /></svg>
                  {f.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="hc-hint">Drag to rotate · double-click to open</div>
    </div>
  );
}
