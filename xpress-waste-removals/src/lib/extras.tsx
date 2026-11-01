import { FormEvent, useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowUp, Check, X, Zap } from 'lucide-react';

type Opt = { value: string; label: string };

/** Site-wide extras: scroll-progress back-to-top ring and a quick-quote popover. */
export function SiteExtras({ services, cities, onGo }: { services: Opt[]; cities: Opt[]; onGo: (path: string) => void }) {
  const panel = useRef<HTMLDivElement>(null);
  const [pct, setPct] = useState(0);
  const [open, setOpen] = useState(false);
  const [service, setService] = useState('');
  const [city, setCity] = useState('');

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setPct(max > 0 ? Math.min(window.scrollY / max, 1) : 0);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    window.addEventListener('scroll', onScroll, { passive: true });
    update();
    return () => { window.removeEventListener('scroll', onScroll); if (raf) cancelAnimationFrame(raf); };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    const onDown = (e: PointerEvent) => {
      const t = e.target as Element;
      if (!panel.current?.contains(t) && !t.closest?.('.xd-quote')) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onDown); };
  }, [open]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const q = new URLSearchParams();
    if (service) q.set('service', service);
    if (city) q.set('postcode', city);
    const qs = q.toString();
    setOpen(false);
    onGo(`/quote${qs ? `?${qs}` : ''}`);
  };

  return <>
    <div className="xdock">
      <div className={`xd-panel ${open ? 'open' : ''}`} ref={panel} role="dialog" aria-label="Quick quote" aria-hidden={!open}>
        <div className="xd-head"><strong>Quick quote</strong><button type="button" onClick={() => setOpen(false)} aria-label="Close quick quote" tabIndex={open ? 0 : -1}><X size={16} /></button></div>
        <p>Pick what needs to go and where you are. We will pre-fill your free quote.</p>
        <form onSubmit={submit}>
          <label>Service<select value={service} onChange={(e) => setService(e.target.value)} tabIndex={open ? 0 : -1}><option value="">Not sure yet</option>{services.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select></label>
          <label>City<select value={city} onChange={(e) => setCity(e.target.value)} tabIndex={open ? 0 : -1}><option value="">Any city</option>{cities.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select></label>
          <button type="submit" className="xd-go" tabIndex={open ? 0 : -1}>Continue to free quote <ArrowRight size={16} /></button>
        </form>
      </div>
      <button type="button" className={`xd-quote ${open ? 'is-open' : ''}`} onClick={() => setOpen((v) => !v)} aria-expanded={open}><Zap size={16} /> Quick quote</button>
      <button type="button" className={`xd-top ${pct > 0.06 ? 'show' : ''}`} style={{ ['--p' as string]: `${Math.round(pct * 360)}deg` }} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Back to top"><span><ArrowUp size={18} /></span></button>
    </div>
  </>;
}

const prepItems = [
  ['Decide what is staying', 'Walk round once and set aside anything you are keeping.'],
  ['Note the access', 'Stairs, lifts, narrow doors or a long carry all help us plan.'],
  ['Check where the van can park', 'Tell us if there is a driveway, permit bay or a street to plan around.'],
  ['Take a few photos', 'A couple of clear photos make the job easy to picture.'],
  ['Keep valuables and paperwork safe', 'Put anything personal somewhere out of the way before we arrive.'],
];

/** Interactive "before you book" checklist with live progress. */
export function PrepChecklist({ title, onQuote }: { title: string; onQuote: () => void }) {
  const [done, setDone] = useState<boolean[]>(() => prepItems.map(() => false));
  const count = done.filter(Boolean).length;
  const all = count === prepItems.length;
  const toggle = (i: number) => setDone((d) => d.map((v, k) => (k === i ? !v : v)));
  return <section className="section prep-section" id="sv-prep"><div className="container prep-grid">
    <div className="prep-side reveal-up">
      <div className="eyebrow dark">Before you book</div>
      <h2>A quick checklist<br /><span>for {title}.</span></h2>
      <p>Tick these off and your quote is easier to work out. None of it is compulsory.</p>
      <div className="prep-meter" role="progressbar" aria-valuemin={0} aria-valuemax={prepItems.length} aria-valuenow={count} aria-label="Checklist progress"><i style={{ width: `${(count / prepItems.length) * 100}%` }} /></div>
      <small className="prep-count">{count} of {prepItems.length} done</small>
    </div>
    <div className="prep-list reveal-up">
      {prepItems.map(([t, d], i) => <label key={t} className={`prep-item ${done[i] ? 'is-done' : ''}`}><input type="checkbox" checked={done[i]} onChange={() => toggle(i)} /><span className="prep-box" aria-hidden="true"><Check size={16} /></span><span className="prep-text"><strong>{t}</strong><small>{d}</small></span></label>)}
      <div className={`prep-cta ${all ? 'ready' : ''}`}><span>{all ? 'You are all set. Let us price it up.' : 'Ready when you are.'}</span><button type="button" className="button button-primary" onClick={onQuote}>Get a free quote <ArrowRight size={17} /></button></div>
    </div>
  </div></section>;
}
