import { useEffect, useRef, useState, type MouseEvent } from 'react';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Cursor-following glow: sets --mx / --my (px) on the hovered element. */
export function glowMove(e: MouseEvent<HTMLElement>) {
  if (prefersReducedMotion()) return;
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  el.style.setProperty('--mx', `${e.clientX - r.left}px`);
  el.style.setProperty('--my', `${e.clientY - r.top}px`);
}

/** 3D tilt + glow: sets --rx / --ry (deg) plus the glow position. */
export function tiltMove(e: MouseEvent<HTMLElement>) {
  if (prefersReducedMotion()) return;
  glowMove(e);
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  const px = (e.clientX - r.left) / r.width - 0.5;
  const py = (e.clientY - r.top) / r.height - 0.5;
  el.style.setProperty('--ry', `${(px * 9).toFixed(2)}deg`);
  el.style.setProperty('--rx', `${(-py * 9).toFixed(2)}deg`);
}

export function tiltLeave(e: MouseEvent<HTMLElement>) {
  e.currentTarget.style.removeProperty('--rx');
  e.currentTarget.style.removeProperty('--ry');
}

/** Magnetic pull: nudges a button a few px towards the cursor (sets --tx / --ty). */
export function magnetMove(e: MouseEvent<HTMLElement>) {
  if (prefersReducedMotion()) return;
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  el.style.setProperty('--tx', `${(((e.clientX - r.left) / r.width - 0.5) * 12).toFixed(1)}px`);
  el.style.setProperty('--ty', `${(((e.clientY - r.top) / r.height - 0.5) * 9).toFixed(1)}px`);
}

export function magnetLeave(e: MouseEvent<HTMLElement>) {
  e.currentTarget.style.removeProperty('--tx');
  e.currentTarget.style.removeProperty('--ty');
}

/** Thin gradient bar at the top of the page showing scroll progress. */
export function ScrollProgress() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = ref.current;
      if (!el) return;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      el.style.transform = `scaleX(${max > 0 ? Math.min(window.scrollY / max, 1) : 0})`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
  return <div className="scroll-progress" ref={ref} aria-hidden="true" />;
}

export function useInView<T extends Element>(threshold = 0.15) {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (!('IntersectionObserver' in window)) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, visible };
}

export function CountUp({ to, decimals = 0 }: { to: number; decimals?: number }) {
  const { ref, visible } = useInView<HTMLSpanElement>(0.5);
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!visible) return;
    const duration = 1400;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(to * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [visible, to]);

  return <span ref={ref}>{value.toFixed(decimals)}</span>;
}

/** Mouse-driven 3D tilt for every element matching `selector` (one delegated listener). Sets --rx / --ry. */
export function usePageTilt(selector: string) {
  useEffect(() => {
    if (prefersReducedMotion() || !window.matchMedia('(hover: hover)').matches) return;
    let last: HTMLElement | null = null;
    const reset = (el: HTMLElement | null) => { el?.style.removeProperty('--rx'); el?.style.removeProperty('--ry'); };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const el = (e.target as Element | null)?.closest?.(selector) as HTMLElement | null;
      if (last && last !== el) reset(last);
      last = el;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      const s = r.width > 500 ? 6 : 12;
      el.style.setProperty('--ry', `${(px * s).toFixed(2)}deg`);
      el.style.setProperty('--rx', `${(-py * s).toFixed(2)}deg`);
    };
    const onLeave = () => { reset(last); last = null; };
    document.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    return () => { document.removeEventListener('pointermove', onMove); document.removeEventListener('pointerleave', onLeave); reset(last); };
  }, [selector]);
}

/** Returns the id of the section currently in view (for "on this page" navs). */
export function useScrollSpy(ids: string[]) {
  const [active, setActive] = useState('');
  const key = ids.join('|');
  useEffect(() => {
    const els = ids.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    if (!els.length || !('IntersectionObserver' in window)) return;
    const obs = new IntersectionObserver((entries) => { entries.forEach((en) => { if (en.isIntersecting) setActive(en.target.id); }); }, { rootMargin: '-35% 0px -55% 0px' });
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return active;
}
