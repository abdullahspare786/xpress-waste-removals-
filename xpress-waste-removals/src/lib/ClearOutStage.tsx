import { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { startClearOut } from './clearOutEngine';
import { startClearOutGL } from './clearOutGL';

const TOTAL = 7;

/** Decorative 3D "clear-out" scene for the home hero. WebGL2 ray-marched scene (clearOutGL.ts) with the 2D scene (clearOutEngine.ts) as fallback. */
export function ClearOutStage() {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [count, setCount] = useState(0);
  const [mode, setMode] = useState<'gl' | '2d'>('gl');

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const interactive = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const base = { host, reduced, interactive, onCount: (n: number) => setCount(n) };
    if (mode === 'gl') {
      const stop = startClearOutGL(canvas, { ...base, onFail: () => setMode('2d') });
      if (!stop) { setMode('2d'); return; }
      return stop;
    }
    return startClearOut(canvas, base);
  }, [mode]);

  const done = count >= TOTAL;
  return (
    <div ref={hostRef} className={`hx-stage${mode === 'gl' ? ' hx-stage-gl' : ''}`} aria-hidden="true">
      <canvas key={mode} ref={canvasRef} />
      <div className={`hx-stage-chip${done ? ' done' : ''}`}>
        <span className="hx-stage-ic">{done ? <Check size={14} strokeWidth={3} /> : <i />}</span>
        <div>
          <strong>{done ? 'Space cleared' : `${count} of ${TOTAL} items cleared`}</strong>
          <span className="hx-stage-bar"><b style={{ width: `${(count / TOTAL) * 100}%` }} /></span>
        </div>
      </div>
    </div>
  );
}
