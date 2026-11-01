import { FormEvent, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, ReactNode, useEffect, useState } from 'react';
import {
  ArrowRight,
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  FileCheck2,
  Leaf,
  MapPin,
  Mail,
  Menu,
  Phone,
  Recycle,
  Send,
  ShieldCheck,
  Sparkles,
  Truck,
  X,
  Zap,
  ClipboardList,
  CalendarCheck,
  Smile,
  Search,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { ScrollProgress, magnetLeave, magnetMove, tiltLeave, tiltMove, usePageTilt, useScrollSpy } from '@/lib/motion';
import { PrepChecklist, SiteExtras } from '@/lib/extras';
import { HeroCube } from '@/lib/HeroCube';
import { BrandLogo } from '@/lib/BrandLogo';

// TODO: replace with your real phone number (digits only, e.g. '02476123456')
const PHONE = 'REPLACE_ME';

type Route = { type: 'home' | 'quote' | 'service' | 'area' | 'services-index' | 'areas-index'; slug?: string; service?: string; postcode?: string; size?: string };

type Service = {
  slug: string;
  title: string;
  eyebrow: string;
  description: string;
  icon: typeof Truck;
  accent: string;
  bullets: string[];
};

const services: Service[] = [
  { slug: 'house-clearance', title: 'House clearance', eyebrow: 'A fresh start', description: 'From a single room to a full property, we clear spaces carefully, quickly and with respect.', icon: Truck, accent: 'amber', bullets: ['Full and partial clearances', 'Basement, loft and garage clear-outs', 'Landlord and probate clearances'] },
  { slug: 'garden-waste-removal', title: 'Garden waste removal', eyebrow: 'Clear the way', description: 'Take back your garden with tidy, responsible removal of green waste, branches and outdoor clutter.', icon: Leaf, accent: 'sky', bullets: ['Branches, soil and green waste', 'Sheds, play equipment and rubble', 'One-off or seasonal clearances'] },
  { slug: 'furniture-appliance-removal', title: 'Furniture & appliance removal', eyebrow: 'Make space', description: 'We lift, load and remove unwanted furniture and appliances without the hassle or heavy lifting.', icon: Recycle, accent: 'blue', bullets: ['Sofas, beds and wardrobes', 'Fridges, cookers and washing machines', 'Donation and recycling first'] },
  { slug: 'moving-service', title: 'Moving service', eyebrow: 'Move with ease', description: 'A friendly extra pair of hands for local moves, deliveries and those awkward things that do not fit in the car.', icon: Truck, accent: 'orange', bullets: ['Home and flat moves', 'Single-item collection and delivery', 'Careful loading and unloading'] },
  { slug: 'office-commercial-clearance', title: 'Office & commercial clearance', eyebrow: 'Business, uninterrupted', description: 'Professional clearances for offices, shops, landlords and building sites, with flexible timings to suit you.', icon: Building2, accent: 'gold', bullets: ['Office furniture and IT equipment', 'Retail and warehouse clearances', 'Out-of-hours appointments available'] },
  { slug: 'recycling-responsible-disposal', title: 'Recycling & responsible disposal', eyebrow: 'Better rubbish habits', description: 'We sort every load with care, sending reusable items to good homes and waste to the right facilities.', icon: Recycle, accent: 'teal', bullets: ['Reuse and donation where possible', 'Responsible waste disposal', 'Clear, responsible disposal'] },
];

const serviceHeroImages: Record<string, string> = {
  'house-clearance': '/hero-service-house-clearance.webp',
  'garden-waste-removal': '/hero-service-garden-waste-removal.webp',
  'furniture-appliance-removal': '/hero-service-furniture-appliance-removal.webp',
  'moving-service': '/hero-service-moving-service.webp',
  'office-commercial-clearance': '/hero-service-office-commercial-clearance.webp',
  'recycling-responsible-disposal': '/hero-service-recycling-responsible-disposal.webp',
};

const serviceCardImages: Record<string, string> = Object.fromEntries(Object.keys(serviceHeroImages).map((slug) => [slug, `/card-service-${slug}.webp`]));

const areas = [
  { slug: 'coventry', name: 'Coventry', blurb: 'Fast, friendly rubbish removal across Coventry and the surrounding CV postcodes.', stat: 'Local team' },
  { slug: 'leicester', name: 'Leicester', blurb: 'Reliable clearances for homes and businesses throughout Leicester and Leicestershire.', stat: 'Local team' },
  { slug: 'birmingham', name: 'Birmingham', blurb: 'Straightforward waste removal across Birmingham, from city centre flats to family homes.', stat: 'Local team' },
];

const cityMapRoads: Record<string, { river?: string; roads: string[] }> = {
  coventry: { river: 'M-10 128 C60 110 110 150 170 120 S270 90 340 104', roads: ['M160 85 L20 20', 'M160 85 L300 25', 'M160 85 L310 150', 'M160 85 L30 160', 'M0 85 L320 85', 'M160 0 L160 170'] },
  leicester: { river: 'M180 -10 C150 40 200 80 165 120 S190 160 175 180', roads: ['M160 85 L10 40', 'M160 85 L310 60', 'M160 85 L290 165', 'M160 85 L40 150', 'M0 110 L320 60', 'M110 0 L210 170'] },
  birmingham: { roads: ['M160 85 L15 15', 'M160 85 L305 30', 'M160 85 L315 140', 'M160 85 L25 150', 'M0 60 L320 110', 'M60 0 L260 170', 'M0 150 L320 20'] },
};

function CityMap({ slug, name, large = false }: { slug: string; name: string; large?: boolean }) {
  const cfg = cityMapRoads[slug];
  const places = areaDetails[slug]?.places ?? [];
  if (!cfg) return null;
  const H = large ? 340 : 170, k = H / 170, cx = 160, cy = H / 2;
  const ringRx = 118, ringRy = 62 * k;
  const ringPath = `M${cx - ringRx} ${cy} a${ringRx} ${ringRy} 0 1 0 ${ringRx * 2} 0 a${ringRx} ${ringRy} 0 1 0 ${-ringRx * 2} 0`;
  return (
    <span className="cp-map" role="img" aria-label={`Map of ${name} showing the areas we cover`}>
      <svg viewBox={`0 0 320 ${H}`} preserveAspectRatio="xMidYMid slice" focusable="false">
        <defs>
          <radialGradient id={`cm-bg-${slug}${large ? '-l' : ''}`} cx="50%" cy="50%" r="80%"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#dcecf8" /></radialGradient>
        </defs>
        <rect width="320" height={H} fill={`url(#cm-bg-${slug}${large ? '-l' : ''})`} />
        <g transform={`scale(1 ${k})`}>
          {Array.from({ length: 9 }, (_, i) => <path key={`v${i}`} d={`M${i * 40} 0 V170`} stroke="#0369a114" vectorEffect="non-scaling-stroke" />)}
          {Array.from({ length: 5 }, (_, i) => <path key={`h${i}`} d={`M0 ${i * 40} H320`} stroke="#0369a114" vectorEffect="non-scaling-stroke" />)}
          {cfg.river && <path className="cm-river" d={cfg.river} fill="none" stroke="#7dd3fc" strokeWidth="9" strokeLinecap="round" vectorEffect="non-scaling-stroke" />}
          {cfg.roads.map((d) => <g key={d}><path d={d} fill="none" stroke="#94b4cc" strokeWidth="4.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" /><path d={d} fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" /></g>)}
        </g>
        <ellipse className="cm-zone" cx={cx} cy={cy} rx={ringRx} ry={ringRy} fill="#0ea5e91a" stroke="#0284c7" strokeWidth="1.6" strokeDasharray="6 5" />
        <ellipse cx={cx} cy={cy} rx="52" ry={28 * k} fill="none" stroke="#0369a155" strokeWidth="2" />
        {places.map((place, i) => {
          const ang = (i / places.length) * Math.PI * 2 - Math.PI / 2;
          const x = cx + Math.cos(ang) * 92, y = cy + Math.sin(ang) * 48 * k;
          const left = Math.cos(ang) < -0.2, mid = Math.abs(Math.cos(ang)) <= 0.2;
          return <g key={place} className="cm-place" style={{ animationDelay: `${0.15 * i + 0.2}s` }}>
            <circle className="cm-dot-pulse" cx={x} cy={y} r="4" fill="#0284c7" style={{ animationDelay: `${0.4 * i}s` }} />
            <circle cx={x} cy={y} r="4" fill="#0284c7" stroke="#fff" strokeWidth="1.8" />
            <text x={x + (mid ? 0 : left ? -9 : 9)} y={y + (mid ? (Math.sin(ang) < 0 ? -9 : 15) : 3.5)} textAnchor={mid ? 'middle' : left ? 'end' : 'start'} fontSize="9.5" fontWeight="700" fill="#0b2a4a" stroke="#ffffffcc" strokeWidth="3" paintOrder="stroke">{place}</text>
          </g>;
        })}
        <g className="cm-truck"><circle r="4.5" fill="#f59e0b" stroke="#fff" strokeWidth="1.8" /><animateMotion dur="9s" repeatCount="indefinite" path={ringPath} /></g>
        <g transform={`translate(${cx} ${cy})`}>
          <circle className="cm-pulse" r="14" fill="#ef444455" />
          <g className="cm-pin"><path d="M0 -13 C-8 -13 -12 -7 -12 -2 C-12 6 0 15 0 15 C0 15 12 6 12 -2 C12 -7 8 -13 0 -13 Z" fill="#ef4444" stroke="#fff" strokeWidth="1.5" /><circle cy="-2" r="4" fill="#fff" /></g>
        </g>
        <text x="12" y={large ? 28 : 22} fontSize={large ? 16 : 13} fontWeight="800" fill="#0b2a4a" letterSpacing=".05em">{name.toUpperCase()}</text>
      </svg>
    </span>
  );
}

type ServiceDetail = { intro: string; takes: string[]; faqs: { q: string; a: string }[] };

const serviceDetails: Record<string, ServiceDetail> = {
  'house-clearance': {
    intro: 'Whether you are clearing a loved one’s home, preparing a rental for new tenants or simply reclaiming a cluttered loft, we handle the sorting, lifting and removal so the whole thing feels manageable.',
    takes: ['Furniture and bedding', 'Boxes, books and household clutter', 'Loft, cellar and garage contents', 'Carpets and flooring', 'Broken or unwanted fittings'],
    faqs: [
      { q: 'Can you clear a whole property in one day?', a: 'Most single-property clearances can be completed in a day. Tell us about the size and access in your quote request and we will plan the right crew and timings.' },
      { q: 'Do I need to be there?', a: 'We can work with keyholders, agents and solicitors, so you do not always have to be on site. Just let us know the arrangements when you enquire.' },
      { q: 'What happens to my items?', a: 'We reuse, donate and recycle whatever we can before anything is sent for disposal.' },
    ],
  },
  'garden-waste-removal': {
    intro: 'Overgrown borders, felled branches, an old shed or a pile of rubble — we clear the lot and leave your outdoor space ready to enjoy again.',
    takes: ['Hedge trimmings and branches', 'Soil, turf and green waste', 'Old sheds, fencing and decking', 'Garden furniture and play equipment', 'Paving and light rubble'],
    faqs: [
      { q: 'Do you do one-off garden clear-ups?', a: 'Yes. We handle one-off tidy-ups as well as seasonal clearances.' },
      { q: 'Can you remove heavy items like paving or soil?', a: 'Yes, tell us roughly how much there is and where it is, and we will plan the load accordingly.' },
      { q: 'Is the waste disposed of responsibly?', a: 'Green waste is separated and taken to appropriate facilities wherever possible.' },
    ],
  },
  'furniture-appliance-removal': {
    intro: 'Old sofa, worn-out wardrobe or a fridge that has seen better days — we collect bulky items from any room, carry them out and take care of the rest.',
    takes: ['Sofas, armchairs and mattresses', 'Beds, wardrobes and tables', 'Fridges, freezers and cookers', 'Washing machines and dishwashers', 'TVs and other electrical items'],
    faqs: [
      { q: 'Can you collect just one item?', a: 'Absolutely. Single-item collections are no problem, and you will still get a clear price.' },
      { q: 'Do you disconnect appliances?', a: 'Please make sure appliances are disconnected before we arrive. If you are unsure, mention it in your quote request.' },
      { q: 'Can you collect from upstairs?', a: 'Yes, our team lifts and carries from any floor. Let us know about stairs or lifts so we can plan ahead.' },
    ],
  },
  'moving-service': {
    intro: 'A friendly extra pair of hands for local moves, awkward deliveries and the things that simply will not fit in the car.',
    takes: ['Flat and small-house moves', 'Single-item collection and delivery', 'Furniture shifted between rooms or properties', 'Marketplace and second-hand purchases', 'Student and short-distance moves'],
    faqs: [
      { q: 'Do you handle full house moves?', a: 'We are best suited to local and smaller moves. Tell us the details and we will let you know honestly if we are the right fit.' },
      { q: 'Can you collect something I bought online?', a: 'Yes, we can collect and deliver single items for you.' },
      { q: 'Is loading and unloading included?', a: 'Careful loading and unloading is part of the service.' },
    ],
  },
  'office-commercial-clearance': {
    intro: 'Office moves, closed-down shops and tenant exits need to be handled quickly and with minimum disruption. We work around your timetable, including out-of-hours.',
    takes: ['Desks, chairs and filing cabinets', 'IT equipment and electricals', 'Shop fittings and shelving', 'Warehouse and storage clearances', 'Building site and refurbishment waste'],
    faqs: [
      { q: 'Can you work outside business hours?', a: 'Yes, out-of-hours and weekend appointments are available.' },
      { q: 'Do you handle old IT equipment?', a: 'We can remove IT equipment. Mention it in your request so we can arrange responsible disposal.' },
      { q: 'Can you quote for regular collections?', a: 'Tell us what you need in the quote form and we will come back with options.' },
    ],
  },
  'recycling-responsible-disposal': {
    intro: 'Getting rid of things should not mean filling a landfill. We sort every load, pass on reusable items and send the rest to the right facilities.',
    takes: ['Reusable furniture for donation', 'Metals, cardboard and wood', 'Electricals and appliances', 'Mixed household waste', 'Green waste'],
    faqs: [
      { q: 'How do you decide what gets recycled?', a: 'We sort each load by material and send items for reuse or recycling wherever that is possible.' },
      { q: 'Can you donate items for me?', a: 'Where items are in good condition, we will aim to pass them on for reuse.' },
    ],
  },
};

type AreaDetail = {
  postcodes: string; prefix: string; places: string[]; intro: string; tagline: string; image: string;
  feel: string; highlights: string[]; spots: { name: string; note: string }[]; faqs: { q: string; a: string }[];
};

const areaDetails: Record<string, AreaDetail> = {
  coventry: {
    postcodes: 'All CV postcodes', prefix: 'CV', image: '/hero-crew.webp', tagline: 'Clearances, done the Coventry way.',
    places: ['Earlsdon', 'Cheylesmore', 'Foleshill', 'Binley', 'Tile Hill', 'Allesley'],
    intro: 'From terraced streets in Earlsdon to family homes in Cheylesmore, our Coventry crews keep collections friendly, punctual and tidy.',
    feel: 'Coventry is a city of busy family homes, student lets and growing businesses. Whether it is a loft full of boxes or a landlord turnaround, we turn up on time, load carefully and leave the space clean.',
    highlights: ['House, loft and garage clear-outs', 'Landlord and end-of-tenancy clearances', 'Furniture and appliance collections', 'Garden and green waste removal'],
    spots: [
      { name: 'Earlsdon', note: 'Period terraces and busy family homes' }, { name: 'Cheylesmore', note: 'Family homes and garden clear-ups' },
      { name: 'Foleshill', note: 'Homes, shops and small businesses' }, { name: 'Binley', note: 'Suburban houses and garages' },
      { name: 'Tile Hill', note: 'Family homes and garden waste' }, { name: 'Allesley', note: 'Larger homes and outdoor clearances' },
    ],
    faqs: [
      { q: 'Do you cover all of Coventry?', a: 'We cover all areas of Coventry, across every CV postcode, including Earlsdon, Cheylesmore, Foleshill, Binley, Tile Hill and Allesley.' },
      { q: 'How do I get a price for rubbish removal in Coventry?', a: 'Send your postcode and what needs to go through our free quote form. We give you a clear, upfront price with no hidden fees.' },
      { q: 'What can you take in Coventry?', a: 'House and garden clearances, furniture and appliances, office and commercial clearances, and moving help. Ask us if your item is not listed.' },
      { q: 'Do you recycle what you collect?', a: 'Yes. We reuse, donate and recycle wherever possible before anything is sent for disposal.' },
    ],
  },
  leicester: {
    postcodes: 'All LE postcodes', prefix: 'LE', image: '/hero-service-house-clearance.webp', tagline: 'Leicester clear-outs without the stress.',
    places: ['Oadby', 'Aylestone', 'Evington', 'Knighton', 'Braunstone', 'Humberstone'],
    intro: 'Across Leicester and Leicestershire we help homeowners, landlords and local businesses clear unwanted items without the stress.',
    feel: 'From Victorian terraces to modern estates and city shops, Leicester has every kind of clearance. Our local team handles the heavy lifting and sorts every load responsibly.',
    highlights: ['Full and partial house clearances', 'Landlord and probate clearances', 'Shop, office and commercial clear-outs', 'Responsible recycling and disposal'],
    spots: [
      { name: 'Oadby', note: 'Family homes and garden clearances' }, { name: 'Aylestone', note: 'Terraces, flats and garages' },
      { name: 'Evington', note: 'Homes and loft clear-outs' }, { name: 'Knighton', note: 'Larger homes and moves' },
      { name: 'Braunstone', note: 'Family homes and bulky items' }, { name: 'Humberstone', note: 'Homes and local businesses' },
    ],
    faqs: [
      { q: 'Do you cover all of Leicester?', a: 'We cover all areas of Leicester, across every LE postcode, including Oadby, Aylestone, Evington, Knighton, Braunstone and Humberstone.' },
      { q: 'How do I get a price for rubbish removal in Leicester?', a: 'Send your postcode and what needs to go through our free quote form. We give you a clear, upfront price with no hidden fees.' },
      { q: 'Do you help landlords and businesses in Leicester?', a: 'Yes. We handle landlord and probate clearances as well as office and commercial clear-outs, with flexible timings to suit you.' },
      { q: 'Do you recycle what you collect?', a: 'Yes. We reuse, donate and recycle wherever possible before anything is sent for disposal.' },
    ],
  },
  birmingham: {
    postcodes: 'All B postcodes', prefix: 'B', image: '/hero-movers.webp', tagline: 'Birmingham waste removal, made simple.',
    places: ['Edgbaston', 'Harborne', 'Moseley', 'Kings Heath', 'Selly Oak', 'Sutton Coldfield'],
    intro: 'From city-centre flats to suburban family homes, our Birmingham team is on hand seven days a week.',
    feel: 'Birmingham is big, busy and varied, and so are the jobs we take on. From a single sofa to a whole-property clearance, we make it straightforward from first message to final sweep.',
    highlights: ['City-centre flat and apartment clear-outs', 'Student house and landlord clearances', 'Furniture, appliance and garden waste', 'Moving help and single-item collections'],
    spots: [
      { name: 'Edgbaston', note: 'Larger homes, flats and moves' }, { name: 'Harborne', note: 'Family homes and flat clearances' },
      { name: 'Moseley', note: 'Period homes and house clear-outs' }, { name: 'Kings Heath', note: 'Terraces, shops and garages' },
      { name: 'Selly Oak', note: 'Student houses and end-of-tenancy' }, { name: 'Sutton Coldfield', note: 'Family homes and gardens' },
    ],
    faqs: [
      { q: 'Do you cover all of Birmingham?', a: 'We cover all areas of Birmingham, across every B postcode, including Edgbaston, Harborne, Moseley, Kings Heath, Selly Oak and Sutton Coldfield.' },
      { q: 'How do I get a price for rubbish removal in Birmingham?', a: 'Send your postcode and what needs to go through our free quote form. We give you a clear, upfront price with no hidden fees.' },
      { q: 'Can you clear a flat or student house?', a: 'Yes. We regularly clear flats, student houses and end-of-tenancy properties, and we can load and carry everything for you.' },
      { q: 'Do you recycle what you collect?', a: 'Yes. We reuse, donate and recycle wherever possible before anything is sent for disposal.' },
    ],
  },
};

const howSteps = [
  { icon: ClipboardList, title: 'Tell us what you need', text: 'Send a few details about what needs to go. It takes about a minute.' },
  { icon: Search, title: 'Get a clear price', text: 'We reply with a straightforward, no-obligation quote. No hidden fees.' },
  { icon: CalendarCheck, title: 'Pick a time', text: 'Choose a slot that suits you, including weekends.' },
  { icon: Smile, title: 'We clear it, you relax', text: 'We lift, load and sweep up, then sort everything responsibly.' },
];

const homeFaqs = [
  { q: 'How quickly can you collect?', a: 'Tell us when suits you in your quote request and we will do our best to fit it in.' },
  { q: 'Is the quote really free?', a: 'Yes. Quotes are free and come with no obligation.' },
  { q: 'What happens to my rubbish?', a: 'Reuse comes first. We donate what we can, recycle what we can, and only send the rest to proper disposal facilities.' },
  { q: 'Which areas do you cover?', a: 'Coventry, Leicester and Birmingham, plus the surrounding postcodes. If you are close by, just ask.' },
];

const loadSizes = [
  { key: 'small', label: 'A few items', van: 'Up to ¼ van', fill: 25, text: 'A sofa, a mattress, a single appliance or a handful of boxes and bags.' },
  { key: 'medium', label: 'A room’s worth', van: 'About ½ van', fill: 55, text: 'A bedroom clear-out, a garden tidy-up or a few bulky pieces of furniture.' },
  { key: 'large', label: 'A big clear-out', van: 'Full van or more', fill: 100, text: 'Loft, garage or whole-property clearances, and larger commercial jobs.' },
];

const rotatingWords = ['lofts', 'gardens', 'garages', 'offices', 'whole houses'];

function RotatingWord() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % rotatingWords.length), 2200);
    return () => clearInterval(id);
  }, []);
  return <div className="rotator" aria-live="off"><span>We clear</span><b key={i}>{rotatingWords[i]}</b></div>;
}

function Marquee() {
  const row = services.map((service) => <span key={service.slug}>{service.title}<Sparkles size={18} /></span>);
  return <section className="marquee" aria-hidden="true"><div className="marquee-track"><span>{row}</span><span>{row}</span></div></section>;
}

function TakeExplorer() {
  const [active, setActive] = useState(services[0].slug);
  const service = services.find((item) => item.slug === active) ?? services[0];
  const detail = serviceDetails[service.slug];
  return <section className="section take-section"><div className="container"><div className="section-heading reveal-up"><div><div className="eyebrow dark">What we take</div><h2>If it needs to go,<br /><span>we’ll take it.</span></h2></div><p>Pick a service to see the kind of items our crews collect every week.</p></div><div className="take-tabs reveal-up" role="tablist">{services.map((item) => { const Icon = item.icon; return <button key={item.slug} role="tab" aria-selected={item.slug === active} className={item.slug === active ? 'active' : ''} onClick={() => setActive(item.slug)}><Icon size={16} /> {item.title}</button>; })}</div><div className="take-panel" key={active}><div className="take-panel-copy"><strong>{service.title}</strong><p>{detail.intro}</p><button className="button button-dark" onClick={() => navigate(`/services/${service.slug}`)}>See the full service <ArrowRight size={17} /></button></div><div className="chip-cloud">{detail.takes.map((item) => <span key={item}><Check size={14} /> {item}</span>)}</div></div></div></section>;
}

function LoadGuide() {
  const [size, setSize] = useState(loadSizes[1].key);
  const current = loadSizes.find((item) => item.key === size) ?? loadSizes[1];
  return <section className="section load-section"><div className="container load-layout"><div><div className="eyebrow dark">Size it up</div><h2>How much<br /><span>needs to go?</span></h2><p>Get a feel for your load in seconds. Pick the closest match and we’ll pass it on with your quote request.</p><div className="load-options">{loadSizes.map((item) => <button key={item.key} className={item.key === size ? 'active' : ''} onClick={() => setSize(item.key)}><strong>{item.label}</strong><small>{item.van}</small></button>)}</div></div><div className="load-card"><div className="load-van" aria-hidden="true"><div className="load-van-bed"><div className="load-van-fill" style={{ width: `${current.fill}%` }} /></div><div className="load-van-cab"><Truck size={26} /></div></div><div className="load-meta"><span className="load-pct">{current.van}</span><p>{current.text}</p></div><button className="button button-primary full-button" onClick={() => navigate(`/quote?size=${current.key}`)}>Get a quote for this load <ArrowRight size={17} /></button></div></div></section>;
}

function InnerHeroVisual({ main, small, badge, map }: { main: string; small: string; map?: { slug: string; name: string }; badge: { icon: ReactNode; title: string; text: string } }) {
  const aim = (e: ReactPointerEvent<HTMLElement>) => {
    if (e.pointerType !== 'mouse') return;
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--px', (((e.clientX - r.left) / r.width - 0.5) * 2).toFixed(3));
    el.style.setProperty('--py', (((e.clientY - r.top) / r.height - 0.5) * 2).toFixed(3));
  };
  const unaim = (e: ReactPointerEvent<HTMLElement>) => { e.currentTarget.style.removeProperty('--px'); e.currentTarget.style.removeProperty('--py'); };
  return <div className="hx-visual" onPointerMove={aim} onPointerLeave={unaim}>
    <div className="hx-ring" />
    <i className="hx-gem g1" aria-hidden="true" /><i className="hx-gem g2" aria-hidden="true" /><i className="hx-gem g3" aria-hidden="true" />
    {map
      ? <div className="hx-photo hx-main hx-map"><CityMap slug={map.slug} name={map.name} large /></div>
      : <div className="hx-photo hx-main"><img className="active" src={main} alt="" width={1100} height={620} decoding="async" loading="eager" /></div>}
    <div className="hx-photo hx-small"><img src={small} alt="" width={400} height={400} loading="lazy" decoding="async" /></div>
    <div className="hx-badge hx-b1"><span className="hx-ic"><FileCheck2 size={20} /></span><div><strong>Free quote</strong><small>No obligation</small></div></div>
    <div className="hx-badge hx-b2"><span className="hx-ic hx-green">{badge.icon}</span><div><strong>{badge.title}</strong><small>{badge.text}</small></div></div>
    <div className="hx-badge hx-b3"><span className="hx-ic"><MapPin size={20} /></span><div><strong>Local team</strong><small>Coventry · Leicester · Birmingham</small></div></div>
  </div>;
}

function getRoute(): Route {
  const hash = window.location.hash.replace('#', '') || '/';
  if (hash.startsWith('/quote')) {
    const query = hash.split('?')[1] ?? '';
    const params = new URLSearchParams(query);
    return { type: 'quote', slug: params.get('service') ?? undefined, postcode: params.get('postcode') ?? undefined, size: params.get('size') ?? undefined };
  }
  const plain = hash.split('?')[0].replace(/\/+$/, '');
  if (plain === '/services') return { type: 'services-index' };
  if (plain === '/areas') return { type: 'areas-index' };
  if (hash.startsWith('/services/')) return { type: 'service', slug: hash.split('/')[2] };
  if (hash.startsWith('/areas/')) { const parts = hash.split('?')[0].split('/'); return { type: 'area', slug: parts[2], service: parts[3] }; }
  return { type: 'home' };
}

// Site version shown in the header. Bump this by 1 on every update.
const SITE_VERSION = 54;

function navigate(path: string) {
  window.location.hash = path;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

const whyPoints = [
  { icon: ClipboardList, title: 'Clear, upfront pricing', text: 'No hidden fees. No awkward surprises. You know the price before we start.' },
  { icon: Truck, title: 'We do the heavy lifting', text: 'From the loft to the garden, we load, carry and clear it all for you.' },
  { icon: Recycle, title: 'Reuse before landfill', text: 'We donate and recycle wherever possible, and sort every load responsibly.' },
  { icon: ShieldCheck, title: 'Licensed and fully insured', text: 'A licensed waste carrier, so your waste is handled legally and with care.' },
  { icon: MapPin, title: 'Local to your area', text: 'Serving Coventry, Leicester and Birmingham, including nearby areas.' },
  { icon: Smile, title: 'Friendly, on-time service', text: 'We arrive when we say we will and treat your space with respect.' },
];

const whyFaqs = [
  { q: 'Is Xpress Waste Removals a licensed waste carrier?', a: 'Yes. Xpress Waste Removals is a licensed waste carrier and is fully insured, so your rubbish is collected and disposed of legally and responsibly.' },
  { q: 'Which areas does Xpress Waste Removals cover?', a: 'We provide rubbish removal in Coventry, Leicester and Birmingham, including nearby areas. Add your postcode to the free quote form and we will confirm coverage.' },
  { q: 'What kinds of rubbish can you remove?', a: 'We handle house clearances, garden waste, furniture and appliance removal, office and commercial clearances, moving help, and recycling and responsible disposal.' },
  { q: 'Do you recycle the waste you collect?', a: 'Yes. We reuse, donate and recycle wherever possible before anything is sent for disposal.' },
  { q: 'How do I get a price for rubbish removal?', a: 'Request a free quote online with your postcode and what needs to go. Our pricing is clear and upfront, with no hidden fees.' },
];

function WhyXpress() {
  const schema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: whyFaqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  }).replace(/</g, '\\u003c');
  return <section className="why-section" id="why-us" aria-labelledby="why-heading">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: schema }} />
    <div className="why-glow" aria-hidden="true" />
    <div className="container why-grid">
      <div className="why-visual reveal-up">
        <div className="why-photo">
          <img src="/hero-crew.webp" alt="Xpress Waste Removals crew loading a van during a rubbish collection" loading="lazy" decoding="async" />
        </div>
        <div className="why-badge why-badge-top"><span><ShieldCheck size={18} /></span><div><strong>Licensed waste carrier</strong><small>Fully insured</small></div></div>
        <div className="why-badge why-badge-bottom"><span><Recycle size={18} /></span><div><strong>Reuse before landfill</strong><small>Sorted responsibly</small></div></div>
      </div>
      <div className="why-copy">
        <div className="eyebrow dark">Why choose Xpress Waste Removals</div>
        <h2 id="why-heading">We leave things<br /><span>better than we found them.</span></h2>
        <p className="why-lead">Xpress Waste Removals is a licensed, fully insured rubbish removal company serving Coventry, Leicester and Birmingham. We arrive when we say we will, treat your space with care, and sort every load responsibly.</p>
        <ul className="why-points">
          {whyPoints.map((point) => { const Icon = point.icon; return <li key={point.title} className="reveal-up"><span className="why-icon"><Icon size={20} /></span><div><h3>{point.title}</h3><p>{point.text}</p></div></li>; })}
        </ul>
        <div className="why-actions">
          <button className="button button-primary" onClick={() => navigate('/quote')}>Get a free quote <ArrowRight size={17} /></button>
          <div className="why-cities"><span>We cover</span>{areas.map((area) => <a key={area.slug} href={`#/areas/${area.slug}`}><MapPin size={13} /> {area.name}</a>)}</div>
        </div>
      </div>
    </div>
    <div className="container why-answers">
      <h3>Quick answers about Xpress Waste Removals</h3>
      <div className="why-faq">
        {whyFaqs.map((faq) => <details key={faq.q}><summary>{faq.q}<ChevronDown size={18} /></summary><p>{faq.a}</p></details>)}
      </div>
    </div>
  </section>;
}

function goWhyUs() {
  const scroll = () => document.getElementById('why-us')?.scrollIntoView({ behavior: 'smooth' });
  if ((window.location.hash.replace('#', '') || '/') === '/') { scroll(); return; }
  window.location.hash = '/';
  setTimeout(scroll, 150);
}

function App() {
  const [route, setRoute] = useState<Route>(getRoute);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  usePageTilt('.cp-stats-grid > div, .sv-item, .cp-step, .cp-other, .sv-pager-btn');

  useEffect(() => {
    const onHashChange = () => setRoute(getRoute());
    const onScroll = () => setIsScrolled(window.scrollY > 24);
    window.addEventListener('hashchange', onHashChange);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener('hashchange', onHashChange);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  useEffect(() => {
    const brand = 'Xpress Waste Removals';
    let title = `${brand} | Rubbish removal in Coventry, Leicester & Birmingham`;
    if (route.type === 'quote') title = `Free quote | ${brand}`;
    if (route.type === 'service') title = `${services.find((x) => x.slug === route.slug)?.title ?? 'Services'} | ${brand}`;
    if (route.type === 'area') title = `Rubbish removal in ${areas.find((x) => x.slug === route.slug)?.name ?? 'your area'} | ${brand}`;
    let description: string | undefined;
    const cityMatch = areas.find((x) => x.slug === route.slug);
    const serviceMatch = services.find((x) => x.slug === route.service);
    if (route.type === 'area' && cityMatch && serviceMatch) {
      title = `${serviceMatch.title} in ${cityMatch.name} | ${brand}`;
      description = `${serviceMatch.title} in ${cityMatch.name} from Xpress Waste Removals. Licensed, fully insured and covering every ${areaDetails[cityMatch.slug].prefix} postcode. Get a free, no-obligation quote with clear upfront pricing.`;
    } else if (route.type === 'area' && cityMatch) {
      description = `Rubbish removal in ${cityMatch.name} from Xpress Waste Removals. House clearance, garden waste, furniture and appliance removal and more across every ${areaDetails[cityMatch.slug].prefix} postcode. Free quote.`;
    } else if (route.type === 'service' && serviceMatch) {
      description = `${serviceMatch.title} across Coventry, Leicester and Birmingham. ${serviceMatch.description} Free, no-obligation quote.`;
    }
    if (route.type === 'services-index') {
      title = `Our services | ${brand}`;
      description = 'All Xpress Waste Removals services: house clearance, garden waste removal, furniture and appliance removal, moving help, office and commercial clearance, and recycling. Free quote across Coventry, Leicester and Birmingham.';
    }
    if (route.type === 'areas-index') {
      title = `Areas we cover | ${brand}`;
      description = 'Xpress Waste Removals covers every area of Coventry, Leicester and Birmingham. Find your city, see the services available locally and get a free, no-obligation quote.';
    }
    document.title = title;
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) { meta = document.createElement('meta'); meta.setAttribute('name', 'description'); document.head.appendChild(meta); }
    if (!meta.getAttribute('data-orig')) meta.setAttribute('data-orig', meta.getAttribute('content') ?? '');
    meta.setAttribute('content', description ?? meta.getAttribute('data-orig') ?? '');
  }, [route]);

  const lamp = (e: ReactMouseEvent<HTMLElement>) => {
    const box = e.currentTarget;
    const t = (e.target as Element).closest('.nav-links > button:not(.nav-cta), .nav-links > .nav-dropdown') as HTMLElement | null;
    if (!t) { box.classList.remove('lit'); return; }
    box.style.setProperty('--lx', `${t.offsetLeft}px`);
    box.style.setProperty('--lw', `${t.offsetWidth}px`);
    box.classList.add('lit');
  };
  const onHome = route.type === 'home';
  const onServices = route.type === 'service' || route.type === 'services-index';
  const onAreas = route.type === 'area' || route.type === 'areas-index';
  return (
    <div className="site-shell">
      <ScrollProgress />
      <div className={`header-sticky on-home ${isScrolled ? 'is-scrolled' : ''}`}>
        <header className={`nav-wrap ${isScrolled ? 'is-scrolled' : ''}`}>
        <nav className="nav container">
          <button className="brand" onClick={() => navigate('/')} aria-label="Xpress Waste Removals home"><BrandLogo className="brand-logo" /><span className="ver-badge">v{SITE_VERSION}</span></button>
          <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">{menuOpen ? <X /> : <Menu />}</button>
          <div className={`nav-links ${menuOpen ? 'open' : ''}`} onMouseMove={lamp} onMouseLeave={(e) => e.currentTarget.classList.remove('lit')}>
            <button className={onHome ? 'is-active' : undefined} aria-current={onHome ? 'page' : undefined} onClick={() => { navigate('/'); setMenuOpen(false); }}>Home</button>
            <div className={`nav-dropdown${onServices ? ' is-active' : ''}`}><button>Services <ChevronDown size={14} /></button><div className="dropdown-panel"><button className="dropdown-all" onClick={() => { navigate('/services'); setMenuOpen(false); }}>All services</button>{services.map((service) => <button key={service.slug} onClick={() => { navigate(`/services/${service.slug}`); setMenuOpen(false); }}>{service.title}</button>)}</div></div>
            <div className={`nav-dropdown${onAreas ? ' is-active' : ''}`}><button>Areas <ChevronDown size={14} /></button><div className="dropdown-panel"><button className="dropdown-all" onClick={() => { navigate('/areas'); setMenuOpen(false); }}>All areas</button>{areas.map((area) => <button key={area.slug} onClick={() => { navigate(`/areas/${area.slug}`); setMenuOpen(false); }}>{area.name}</button>)}</div></div>
            <button onClick={() => { goWhyUs(); setMenuOpen(false); }}>Why Xpress</button>
            <button className="nav-cta nav-cta-mobile" onClick={() => { navigate('/quote'); setMenuOpen(false); }}>Get a free quote <ArrowRight size={16} /></button>
          </div>
          <div className="nav-actions">
            <a className="nav-phone" href={`tel:${PHONE}`}><span className="nav-phone-icon"><Phone size={16} /></span>{PHONE}</a>
            <button className="nav-cta" onClick={() => navigate('/quote')}>Get a free quote <ArrowRight size={16} /></button>
          </div>
        </nav>
      </header>
      </div>
      <main key={`${route.type}-${route.slug ?? ''}-${route.service ?? ''}-${route.postcode ?? ''}-${route.size ?? ''}`} className="page-enter">
        {route.type === 'home' && <Home />}
        {route.type === 'quote' && <QuotePage preset={route.slug} presetPostcode={route.postcode} presetSize={route.size} />}
        {route.type === 'service' && <ServicePage slug={route.slug} />}
        {route.type === 'services-index' && <ServicesIndexPage />}
        {route.type === 'areas-index' && <AreasIndexPage />}
        {route.type === 'area' && (route.service ? <CityServicePage slug={route.slug} serviceSlug={route.service} /> : <AreaPage slug={route.slug} />)}
      </main>
      <Footer />
      <a href={`tel:${PHONE}`} className={`fab-call ${isScrolled ? 'show' : ''}`} aria-label="Call us"><Phone size={24} /></a>
      <SiteExtras services={services.map((s) => ({ value: s.slug, label: s.title }))} cities={areas.map((x) => ({ value: areaDetails[x.slug].prefix, label: x.name }))} onGo={navigate} />
    </div>
  );
}

const heroSlides = [
  '/hero-crew.webp',
  '/hero-movers.webp',
];

const crewPhoto = { src: '/hero-crew-clean.webp', alt: '', w: 560, h: 619 };

function HeroCollage() {
  return <div className="hx-visual hx-collage">
    <div className="hx-ring" />
    <HeroCube onOpen={(slug) => navigate(`/services/${slug}`)} />
    <div className="hx-peek" aria-hidden="true">
      <span className="hx-peek-frame">
        <img className="hx-peek-img" src={crewPhoto.src} alt={crewPhoto.alt} width={crewPhoto.w} height={crewPhoto.h} loading="lazy" decoding="async" />
      </span>
      <span className="hx-peek-cap"><small>Real crew</small><strong>Meet our team</strong></span>
    </div>
    <div className="hx-badge hx-b1"><span className="hx-ic"><FileCheck2 size={20} /></span><div><strong>Free quote</strong><small>No obligation</small></div></div>
    <div className="hx-badge hx-b3"><span className="hx-ic"><MapPin size={20} /></span><div><strong>Local team</strong><small>Coventry · Leicester · Birmingham</small></div></div>
  </div>;
}

function heroSpot(event: ReactPointerEvent<HTMLElement>) {
  const el = event.currentTarget;
  const r = el.getBoundingClientRect();
  el.style.setProperty('--hx', `${event.clientX - r.left}px`);
  el.style.setProperty('--hy', `${event.clientY - r.top}px`);
}

function Home() {
  const [quickPostcode, setQuickPostcode] = useState('');
  const [quickService, setQuickService] = useState('');
  function quickQuote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (quickService) params.set('service', quickService);
    if (quickPostcode.trim()) params.set('postcode', quickPostcode.trim().toUpperCase());
    const query = params.toString();
    navigate(`/quote${query ? `?${query}` : ''}`);
  }
  return <>
    <section className="hero hero-x" onPointerMove={heroSpot}>
      <div className="hero-fx" aria-hidden="true"><i className="hfx-orb o1" /><i className="hfx-orb o2" /><i className="hfx-orb o3" /><span className="hfx-spot" /></div>
      <div className="container hx-grid">
        <div className="hx-copy">
          <div className="eyebrow"><span className="eyebrow-dot" /> Local, reliable &amp; responsible</div>
          <h1 className="hx-title"><span className="hx-line"><span>Clear the clutter.</span></span><span className="hx-line"><em>Get your space back.</em></span></h1>
          <p>From a single sofa to a full house clear-out, our local Midlands crew does the lifting, loading and sorting. We reuse and recycle first, with a clear upfront price and zero fuss.</p>
          <RotatingWord />
          <form className="hx-quote" onSubmit={quickQuote}>
            <label><span>Your postcode</span><input name="postcode" value={quickPostcode} onChange={(event) => setQuickPostcode(event.target.value)} placeholder="e.g. CV1 1AA" autoComplete="postal-code" autoCapitalize="characters" /></label>
            <label><span>What needs to go?</span><select name="service" value={quickService} onChange={(event) => setQuickService(event.target.value)}><option value="">Choose a service</option>{services.map((service) => <option key={service.slug} value={service.slug}>{service.title}</option>)}</select></label>
            <button className="button button-primary" type="submit" onMouseMove={magnetMove} onMouseLeave={magnetLeave}>Get free quote <ArrowRight size={18} /></button>
          </form>
          <div className="hx-links"><button className="text-button" type="button" onClick={() => navigate('/services/house-clearance')}>Explore our services <ChevronRight size={16} /></button></div>
          <div className="hero-points"><span><Check size={15} /> Free no-obligation quote</span><span><Check size={15} /> Clear upfront pricing</span><span><Check size={15} /> Reuse &amp; recycle first</span></div>
        </div>
        <HeroCollage />
      </div>
    </section>
    <section className="trust-strip"><div className="container trust-inner"><div><FileCheck2 /> Free no-obligation quote</div><div><ShieldCheck /> Clear upfront pricing</div><div><Recycle /> Reuse and recycle first</div><div><MapPin /> Local team</div></div></section>
    <Marquee />
    <section className="section services-section services-x"><div className="container"><div className="section-heading reveal-up"><div><div className="eyebrow"><span className="eyebrow-dot" /> What we do</div><h2>Whatever needs to go,<br /><span>we will take it from here.</span></h2></div><p>House, garden, office, furniture or a full move. Pick a service and our local crew handles the lifting, loading and recycling, with a free no-obligation quote.</p></div><div className="service-grid reveal-up">{services.map((service, index) => <ServiceCard service={service} index={index} photo={serviceCardImages[service.slug]} key={service.slug} />)}</div><div className="section-foot"><span>Not sure what you need?</span><button className="text-button dark-text" onClick={() => navigate('/quote')}>Tell us what is going on <ArrowRight size={16} /></button></div></div></section>
    <TakeExplorer />
    <WhyXpress />
    <section className="section how-section"><div className="container"><div className="section-heading reveal-up"><div><div className="eyebrow dark">How it works</div><h2>Four easy steps.<br /><span>Zero stress.</span></h2></div><p>From your first message to a clear space, here is exactly what to expect, with no surprises on the day.</p></div><div className="how-grid reveal-up">{howSteps.map((step, index) => { const Icon = step.icon; return <div className="how-step" key={step.title}><span className="how-icon"><Icon size={26} /></span><strong>{step.title}</strong><p>{step.text}</p></div>; })}</div></div></section>
    <LoadGuide />
    <section className="section quote-home" id="free-quote"><div className="container quote-home-inner"><div className="quote-home-copy reveal-up"><div className="eyebrow dark">Free quote</div><h2>Tell us what needs to go.<br /><span>We’ll do the rest.</span></h2><p>Enter your postcode and pick a service. We will take you straight to your quote request.</p><ul className="quote-home-points"><li><ShieldCheck size={18} /> No obligation, ever</li><li><Check size={18} /> Clear upfront pricing</li><li><MapPin size={18} /> Coventry, Leicester and Birmingham</li></ul><div className="quote-home-stats"><div><strong>4.9★</strong><small>900+ reviews</small></div><div><strong>Same-day</strong><small>slots available</small></div><div><strong>Licensed</strong><small>&amp; fully insured</small></div></div></div>
    <div className="quote-card quote-card-home reveal-up"><QuoteForm /></div>
    </div></section>
    <section className="section areas-home"><div className="container"><div className="section-heading reveal-up"><div><div className="eyebrow dark">Where we work</div><h2>Your local team in<br /><span>three cities.</span></h2></div><p>Pick your city to see the areas we cover, the neighbourhoods we know well and how to book your collection.</p></div><div className="areas-home-grid reveal-up">{areas.map((area) => <button key={area.slug} className="area-card" onClick={() => navigate(`/areas/${area.slug}`)} onMouseMove={tiltMove} onMouseLeave={tiltLeave}><CityMap slug={area.slug} name={area.name} /><span className="area-card-top"><MapPin size={20} /><em>{area.stat}</em></span><strong>{area.name}</strong><span className="area-card-text">{area.blurb}</span><span className="area-card-places">{areaDetails[area.slug].places.slice(0, 4).map((place) => <i key={place}>{place}</i>)}</span><span className="service-link">See {area.name} <ArrowRight size={16} /></span></button>)}</div></div></section>
    <section className="section faq-section alt-section"><div className="container faq-layout"><div><div className="eyebrow dark">Good to know</div><h2>Quick<br /><span>answers.</span></h2><p className="faq-side">Still unsure? Call us on <a href={`tel:${PHONE}`}>{PHONE}</a> or send a quote request.</p></div><div className="faq-list">{homeFaqs.map((faq) => <details key={faq.q}><summary>{faq.q}<ChevronDown size={18} /></summary><p>{faq.a}</p></details>)}</div></div></section>
    <CTA />
  </>;
}

function ServiceCard({ service, index, photo }: { service: Service; index: number; photo?: string }) {
  const Icon = service.icon;
  return <button className={`service-card accent-${service.accent}`} onClick={() => navigate(`/services/${service.slug}`)} onMouseMove={tiltMove} onMouseLeave={tiltLeave}>{photo && <span className="service-photo"><img src={photo} alt="" width={760} height={570} loading="lazy" decoding="async" /></span>}<span className="service-icon"><Icon size={25} /></span><span className="service-title">{service.title}</span><span className="service-description">{service.description}</span><span className="service-link">Find out more <ArrowUpRightIcon /></span></button>;
}

function ArrowUpRightIcon() { return <ArrowRight size={16} />; }

type GuideBlock = { h: string; p: string[] };

const serviceGuides: Record<string, { title: string; lead: string; blocks: GuideBlock[] }> = {
  'house-clearance': {
    title: 'Your house clearance guide', lead: 'A house clearance goes smoothly when it starts with a plan. Here is how we like to approach it.',
    blocks: [
      { h: 'Plan the clearance before the van arrives', p: ['Walk through the property room by room and decide what you are keeping, what could be donated and what needs to go. Sorting this way stops things being missed and makes the day itself much quicker.', 'Tell us the size of the property, how easy it is to park and reach the rooms, and any deadline such as a completion date or the end of a tenancy. That lets us plan the right crew and timings.'] },
      { h: 'What happens to your belongings', p: ['We reuse and donate what we can, recycle what is recyclable, and only send what is left for disposal. Good furniture, books and household goods often get a second life instead of going to landfill.'] },
      { h: 'Clearances for landlords, executors and agents', p: ['Clearing a property on someone else’s behalf brings extra practical questions. We can work with keyholders, agents and solicitors, so you do not always have to be on site. Let us know the arrangements when you enquire and we will fit around them.'] },
    ],
  },
  'garden-waste-removal': {
    title: 'Your garden waste guide', lead: 'From a quick tidy-up to a full cut-back, here is what to know before booking a garden clearance.',
    blocks: [
      { h: 'What counts as garden waste', p: ['Garden waste covers green waste such as grass cuttings, hedge trimmings, branches and leaves, as well as heavier outdoor items like soil, rubble, old sheds, fencing and play equipment.', 'Different materials are handled in different ways, so it helps to describe what you have when you ask for a quote.'] },
      { h: 'One-off tidy-ups and seasonal clear-outs', p: ['Many people book after a big spring cut-back or an autumn clear-up. We do the loading and carrying, so you are not left filling bags and ferrying them yourself.'] },
      { h: 'Keeping green waste out of landfill', p: ['We sort each load and send waste to the right facilities, so garden waste is dealt with responsibly rather than being thrown in with general rubbish.'] },
    ],
  },
  'furniture-appliance-removal': {
    title: 'Your furniture and appliance removal guide', lead: 'Bulky items are awkward, heavy and easy to damage a home with. Here is how we make it simple.',
    blocks: [
      { h: 'We do the lifting, you keep your back', p: ['Sofas, beds, wardrobes and white goods are heavy and hard to manoeuvre. Our crew lifts, carries and loads, so you do not have to risk your back or knock your walls and door frames.', 'Mention any stairs, tight corners or narrow doorways when you enquire so we arrive prepared.'] },
      { h: 'Fridges, cookers and washing machines', p: ['Large appliances need to be handled responsibly. We donate or recycle first wherever we can, rather than sending everything for disposal.'] },
      { h: 'One item or a whole room', p: ['Whether it is a single mattress or a whole bedroom’s worth of furniture, tell us what needs to go and where it is, and we will give you a clear price.'] },
    ],
  },
  'moving-service': {
    title: 'Your moving service guide', lead: 'Not every move needs a big removals firm. Here is where an extra pair of hands makes the difference.',
    blocks: [
      { h: 'A helping hand for local moves', p: ['We help with home and flat moves, and with those awkward items that simply do not fit in the car. It is a friendly, flexible option when you do not need a full removals package.'] },
      { h: 'Collection and delivery of single items', p: ['Bought a wardrobe or sofa second-hand? We can collect it and deliver it to your door, loading and unloading carefully at both ends.'] },
      { h: 'Simple ways to prepare for moving day', p: ['Disassemble what you can, measure doorways for large pieces, and group items by room. Letting us know about parking and stairs in advance keeps the day quick and stress-free.'] },
    ],
  },
  'office-commercial-clearance': {
    title: 'Your office and commercial clearance guide', lead: 'Clearing a workplace should not get in the way of running your business. Here is how we keep it smooth.',
    blocks: [
      { h: 'Clearances that fit around your business', p: ['We offer flexible timings, including out-of-hours appointments, so offices, shops and warehouses can be cleared with as little disruption as possible.'] },
      { h: 'Office furniture and IT equipment', p: ['Desks, chairs, filing cabinets and IT equipment are all part of a typical office clearance. If any equipment may hold data, it is sensible to wipe it or remove the drives before collection.'] },
      { h: 'Retail, warehouse and landlord clearances', p: ['From shop fit-outs to warehouse clear-outs and units handed back to landlords, we plan the job around your access, timings and deadlines. Tell us the size and layout when you request a quote.'] },
    ],
  },
  'recycling-responsible-disposal': {
    title: 'Your recycling and responsible disposal guide', lead: 'Where your rubbish ends up matters. Here is how we keep as much as possible out of landfill.',
    blocks: [
      { h: 'Reuse comes first', p: ['Items in good condition are best passed on. We donate and reuse wherever possible, so useful furniture and household goods find new homes instead of being thrown away.'] },
      { h: 'Every load sorted with care', p: ['We sort what we collect, sending recyclable materials to be recycled and the remainder to the right facilities for responsible disposal.'] },
      { h: 'Choosing a responsible waste carrier', p: ['Before booking anyone to take your waste, check that they are a licensed waste carrier and ask what happens to it afterwards. Xpress Waste Removals is a licensed, fully insured waste carrier, and we are happy to explain how we handle your load.'] },
    ],
  },
};

function ServicePage({ slug }: { slug?: string }) {
  const service = services.find((item) => item.slug === slug) ?? services[0];
  const serviceIndex = services.indexOf(service);
  const detail = serviceDetails[service.slug];
  const Icon = service.icon;
  const others = services.filter((item) => item.slug !== service.slug).slice(0, 3);
  const schema = detail ? JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: detail.faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  }).replace(/</g, '\\u003c') : '';
  const words = service.title.split(' ');
  const prev = services[(serviceIndex + services.length - 1) % services.length];
  const next = services[(serviceIndex + 1) % services.length];
  const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const guide = serviceGuides[service.slug];
  const jumps = [['sv-included', 'What’s included'], ...(detail ? [['sv-items', 'Typical items']] : []), ...(guide ? [['sv-guide', 'Guide']] : []), ['sv-prep', 'Before you book'], ['sv-why', 'Why Xpress'], ['sv-quote', 'Free quote'], ...(detail ? [['sv-faq', 'FAQs']] : [])];
  const spy = useScrollSpy(jumps.map(([id]) => id));
  return <>
    <section className="hero hero-x hero-inner"><div className="container hx-grid"><div className="hx-copy"><div className="eyebrow"><span className="eyebrow-dot" /> {service.eyebrow}</div><div className="breadcrumb"><a href="#/">Home</a> <ChevronRight size={14} /> <a href="#/services">Services</a> <ChevronRight size={14} /> {service.title}</div><h1>{service.title}<br /><em>made simple.</em></h1><p>{service.description}</p><div className="hero-actions tight"><button className="button button-primary" onClick={() => navigate(`/quote?service=${service.slug}`)}>Get a free quote <ArrowRight size={18} /></button><a className="hero-phone" href={`tel:${PHONE}`}><Phone size={16} /> {PHONE}</a></div><div className="hero-points"><span><ShieldCheck size={15} /> Free no-obligation quote</span><span><Zap size={15} /> Clear upfront pricing</span><span><Recycle size={15} /> Recycled where possible</span></div></div><InnerHeroVisual main={serviceHeroImages[service.slug]} small={heroSlides[serviceIndex % heroSlides.length]} badge={{ icon: <Icon size={20} />, title: 'Handled with care', text: service.title }} /></div></section>

    <section className="cp-stats"><div className="container cp-stats-grid">
      <div><span className="cp-stat-ic"><FileCheck2 size={20} /></span><strong>Free</strong><small>No-obligation quote</small></div>
      <div><span className="cp-stat-ic"><ClipboardList size={20} /></span><strong>Upfront</strong><small>Clear pricing, no hidden fees</small></div>
      <div><span className="cp-stat-ic"><Recycle size={20} /></span><strong>Reuse</strong><small>Recycled before landfill</small></div>
      <div><span className="cp-stat-ic"><MapPin size={20} /></span><strong>{areas.length}</strong><small>Cities covered</small></div>
    </div></section>

    <nav className="sv-jump" aria-label="On this page"><div className="container sv-jump-inner"><span className="sv-jump-label"><Icon size={16} /> {service.title}</span><div className="sv-jump-links">{jumps.map(([id, label]) => <button key={id} type="button" className={spy === id ? 'active' : undefined} aria-current={spy === id ? 'true' : undefined} onClick={() => jump(id)}>{label}</button>)}</div><button className="sv-jump-cta" type="button" onClick={() => jump('sv-quote')}>Free quote <ArrowRight size={14} /></button></div></nav>

    <section className="section detail-section cp-local" id="sv-included"><div className="container cp-local-grid">
      <div className="reveal-up"><div className="eyebrow dark">What is included</div><h2>{words[0]} {words[1] ?? ''}<br /><span>{words.length > 2 ? words.slice(2).join(' ') : 'done right.'}</span></h2><p className="large-copy">{detail?.intro ?? 'No job is too big, too small or too unusual. Tell us what needs to go and we will give you a straightforward plan and price.'}</p><ul className="cp-checks sv-checks">{service.bullets.map((bullet) => <li key={bullet}><span><Check size={14} /></span>{bullet}</li>)}</ul><div className="cp-local-actions"><button className="button button-primary" onClick={() => navigate(`/quote?service=${service.slug}`)}>Get a free quote <ArrowRight size={17} /></button><a className="text-button" href={`tel:${PHONE}`}>Or call us <ChevronRight size={16} /></a></div></div>
      <aside className="cp-card reveal-up" aria-label="How it works"><div className="cp-card-glow" aria-hidden="true" /><div className="cp-card-top"><span><Icon size={16} /> How it works</span><em>4 easy steps</em></div><div className="sv-steps">{['Tell us what you need', 'Get your clear quote', 'We arrive and clear it', 'You enjoy your space'].map((step, index) => <div className="sv-step" key={step}><span>0{index + 1}</span><strong>{step}</strong></div>)}</div></aside>
    </div></section>

    {detail && <section className="section alt-section" id="sv-items"><div className="container"><div className="section-heading reveal-up"><div><div className="eyebrow dark">Typical items</div><h2>What we<br /><span>regularly take.</span></h2></div><p>Not on the list? Ask us. If it needs to go, there is a good chance we can take it.</p></div><div className="sv-items">{detail.takes.map((item, index) => <div key={item} className="sv-item reveal-up"><span className="sv-item-ic"><Check size={16} /></span><strong>{item}</strong><em>0{index + 1}</em></div>)}</div></div></section>}

    {guide && <section className="section sv-guide" id="sv-guide"><div className="container sv-guide-grid"><div className="sv-guide-side reveal-up"><div className="eyebrow dark">Helpful guide</div><h2>{guide.title}</h2><p>{guide.lead}</p><button className="button button-primary" onClick={() => navigate(`/quote?service=${service.slug}`)}>Get a free quote <ArrowRight size={17} /></button></div><div className="sv-guide-body">{guide.blocks.map((block, index) => <article key={block.h} className="sv-guide-block reveal-up"><h3>{block.h}</h3>{block.p.map((para) => <p key={para}>{para}</p>)}</article>)}</div></div></section>}

    <LoadGuide />

    <PrepChecklist title={service.title.toLowerCase()} onQuote={() => navigate(`/quote?service=${service.slug}`)} />

    <section className="cp-steps" id="sv-why"><div className="container"><div className="section-heading reveal-up"><div><div className="eyebrow">Why Xpress</div><h2>Done properly.<br /><span>Every time.</span></h2></div></div><div className="cp-step-grid">{whyPoints.slice(0, 4).map((point, index) => { const PointIcon = point.icon; return <div key={point.title} className="cp-step reveal-up"><span className="cp-step-ic"><PointIcon size={22} /></span><h3>{point.title}</h3><p>{point.text}</p></div>; })}</div></div></section>

    <section className="section quote-home sv-quote" id="sv-quote"><div className="container quote-home-inner"><div className="quote-home-copy reveal-up"><div className="eyebrow dark">Free quote</div><h2>{service.title}<br /><span>starts with a quote.</span></h2><p>Tell us a little about the job and we will come back with a clear, upfront price. It is free and there is no obligation.</p><ul className="quote-home-points"><li><ShieldCheck size={18} /> No obligation, ever</li><li><Check size={18} /> Clear upfront pricing</li><li><MapPin size={18} /> Coventry, Leicester and Birmingham</li></ul><div className="quote-home-stats"><div><strong>4.9★</strong><small>900+ reviews</small></div><div><strong>Same-day</strong><small>slots available</small></div><div><strong>Licensed</strong><small>&amp; fully insured</small></div></div><a className="sv-call" href={`tel:${PHONE}`}><span><Phone size={18} /></span><div><small>Prefer to talk?</small><strong>{PHONE}</strong></div></a></div><div className="quote-card quote-card-home reveal-up"><QuoteForm preset={service.slug} /></div></div></section>

    {detail && <section className="section faq-section cp-faq" id="sv-faq"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: schema }} /><div className="container faq-layout"><div><div className="eyebrow dark">Good to know</div><h2>Common<br /><span>questions.</span></h2><p className="faq-side">Need a hand? Call us on <a href={`tel:${PHONE}`}>{PHONE}</a>.</p></div><div className="faq-list">{detail.faqs.map((faq) => <details key={faq.q}><summary>{faq.q}<ChevronDown size={18} /></summary><p>{faq.a}</p></details>)}</div></div></section>}

    <section className="section alt-section"><div className="container"><div className="section-heading reveal-up"><div><div className="eyebrow dark">Where we work</div><h2>{service.title} in<br /><span>your city.</span></h2></div><p>We cover every area of Coventry, Leicester and Birmingham.</p></div><div className="cp-other-grid sv-cities">{areas.map((item) => <button key={item.slug} className="cp-other reveal-up" onClick={() => navigate(`/areas/${item.slug}/${service.slug}`)}><CityMap slug={item.slug} name={item.name} /><span className="cp-other-top"><MapPin size={16} /> {areaDetails[item.slug].postcodes}</span><strong>{item.name}</strong><span className="cp-other-text">{service.title} in {item.name}: {item.blurb}</span><span className="cp-other-go">{service.title} in {item.name} <ArrowRight size={15} /></span></button>)}</div></div></section>

    <Marquee />

    <section className="sv-pager"><div className="container sv-pager-grid"><button type="button" className="sv-pager-btn" onClick={() => navigate(`/services/${prev.slug}`)}><ChevronRight size={20} style={{ transform: 'rotate(180deg)' }} /><span><small>Previous service</small><strong>{prev.title}</strong></span></button><button type="button" className="sv-pager-btn sv-pager-next" onClick={() => navigate(`/services/${next.slug}`)}><span><small>Next service</small><strong>{next.title}</strong></span><ChevronRight size={20} /></button></div></section>

    <section className="section related-section"><div className="container"><div className="section-heading compact"><div><div className="eyebrow dark">More from Xpress</div><h2>Other <span>services.</span></h2></div></div><div className="service-grid">{others.map((item) => <ServiceCard service={item} index={services.indexOf(item)} key={item.slug} />)}</div></div></section><CTA /></>;
}

function AreaPage({ slug }: { slug?: string }) {
  const area = areas.find((item) => item.slug === slug) ?? areas[0];
  const detail = areaDetails[area.slug];
  const otherAreas = areas.filter((item) => item.slug !== area.slug);
  const schema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: detail.faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  }).replace(/</g, '\\u003c');
  return <>
    <section className="hero hero-x hero-inner"><div className="container hx-grid"><div className="hx-copy"><div className="eyebrow"><span className="eyebrow-dot" /> Your local clearance team</div><div className="breadcrumb"><a href="#/">Home</a> <ChevronRight size={14} /> <a href="#/areas">Areas</a> <ChevronRight size={14} /> {area.name}</div><h1>Rubbish removal<br /><em>in {area.name}.</em></h1><p>{area.blurb}</p><div className="hero-actions tight"><button className="button button-primary" onClick={() => navigate(`/quote?postcode=${detail.prefix}`)}>Book your collection <ArrowRight size={18} /></button><a className="hero-phone" href={`tel:${PHONE}`}><Phone size={16} /> {PHONE}</a></div><div className="hero-points"><span><MapPin size={15} /> {detail.postcodes}</span><span><ShieldCheck size={15} /> Free no-obligation quote</span><span><Zap size={15} /> {area.stat}</span></div></div><InnerHeroVisual main={detail.image} map={{ slug: area.slug, name: area.name }} small={heroSlides[(areas.indexOf(area) + 1) % heroSlides.length]} badge={{ icon: <MapPin size={20} />, title: area.name, text: area.stat }} /></div></section>

    <section className="cp-stats"><div className="container cp-stats-grid">
      <div><span className="cp-stat-ic"><MapPin size={20} /></span><strong>{detail.prefix}</strong><small>{detail.postcodes}</small></div>
      <div><span className="cp-stat-ic"><Truck size={20} /></span><strong>{services.length}</strong><small>Services available</small></div>
      <div><span className="cp-stat-ic"><Building2 size={20} /></span><strong>All</strong><small>Areas of {area.name}</small></div>
      <div><span className="cp-stat-ic"><FileCheck2 size={20} /></span><strong>Free</strong><small>No-obligation quote</small></div>
    </div></section>

    <section className="section area-content cp-local"><div className="container cp-local-grid">
      <div className="reveal-up"><div className="eyebrow dark">Local service, proper care</div><h2>{detail.tagline.split(' ').slice(0, 2).join(' ')}<br /><span>{detail.tagline.split(' ').slice(2).join(' ')}</span></h2><p className="large-copy">{detail.intro}</p><p className="cp-feel">{detail.feel}</p><ul className="cp-checks">{detail.highlights.map((item) => <li key={item}><span><Check size={14} /></span>{item}</li>)}</ul><div className="cp-local-actions"><button className="button button-primary" onClick={() => navigate(`/quote?postcode=${detail.prefix}`)}>Get a free quote <ArrowRight size={17} /></button><button className="text-button" type="button" onClick={() => navigate('/services/house-clearance')}>Explore services <ChevronRight size={16} /></button></div></div>
      <aside className="cp-card reveal-up" aria-label={`${area.name} coverage`}><div className="cp-card-glow" aria-hidden="true" /><div className="cp-card-top"><span><MapPin size={16} /> Full city coverage</span><em>{area.stat}</em></div><div className="cp-card-big">{detail.prefix}</div><div className="cp-card-name">Every area of {area.name}</div><div className="cp-card-places">{detail.places.map((place) => <i key={place}>{place}</i>)}</div><div className="cp-card-perks"><div><Truck size={18} /><span>Flexible collections</span></div><div><ShieldCheck size={18} /><span>Upfront pricing</span></div><div><Leaf size={18} /><span>Reuse &amp; recycle first</span></div></div></aside>
    </div></section>

    <section className="section alt-section cp-services"><div className="container"><div className="section-heading reveal-up"><div><div className="eyebrow dark">What we do in {area.name}</div><h2>Every kind of<br /><span>clear-out.</span></h2></div><p>One local team for homes, gardens, offices and moves across {area.name}.</p></div><div className="cp-service-grid">{services.map((item, index) => { const Icon = item.icon; return <button key={item.slug} className={`cp-service accent-${item.accent} reveal-up`} onClick={() => navigate(`/areas/${area.slug}/${item.slug}`)}><span className="cp-service-ic"><Icon size={22} /></span><strong>{item.title} in {area.name}</strong><small>{item.eyebrow}. {item.description}</small><span className="cp-service-go">Find out more <ArrowRight size={15} /></span></button>; })}</div></div></section>

    <section className="section cp-spots"><div className="container"><div className="section-heading reveal-up"><div><div className="eyebrow dark">Areas we serve</div><h2>All of<br /><span>{area.name}.</span></h2></div><p>We cover every area of {area.name}, from the city centre to the suburbs. These are just some of the neighbourhoods we visit most.</p></div><div className="cp-spot-grid">{detail.spots.map((spot, index) => <div key={spot.name} className="cp-spot reveal-up"><span className="cp-spot-pin"><MapPin size={18} /></span><div><strong>{spot.name}</strong><small>{spot.note}</small></div><em>0{index + 1}</em></div>)}</div><div className="cp-allareas reveal-up"><span><Check size={18} /></span><div><strong>Every {area.name} street, covered.</strong><small>If you are in {area.name}, we will come to you. Add your postcode to the free quote form.</small></div><button className="button button-primary" onClick={() => navigate(`/quote?postcode=${detail.prefix}`)}>Get a free quote <ArrowRight size={17} /></button></div></div></section>

    <section className="cp-steps"><div className="container"><div className="section-heading reveal-up"><div><div className="eyebrow">How it works</div><h2>Four easy steps.<br /><span>Zero stress.</span></h2></div></div><div className="cp-step-grid">{howSteps.map((step, index) => { const Icon = step.icon; return <div key={step.title} className="cp-step reveal-up"><span className="cp-step-ic"><Icon size={22} /></span><h3>{step.title}</h3><p>{step.text}</p></div>; })}</div></div></section>

    <section className="section faq-section cp-faq"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: schema }} /><div className="container faq-layout"><div><div className="eyebrow dark">Good to know</div><h2>{area.name}<br /><span>questions.</span></h2><p className="faq-side">Need a hand? Call us on <a href={`tel:${PHONE}`}>{PHONE}</a>.</p></div><div className="faq-list">{detail.faqs.map((faq) => <details key={faq.q}><summary>{faq.q}<ChevronDown size={18} /></summary><p>{faq.a}</p></details>)}</div></div></section>

    <section className="section alt-section cp-others"><div className="container"><div className="section-heading compact reveal-up"><div><div className="eyebrow dark">Also covering</div><h2>Our other <span>cities.</span></h2></div></div><div className="cp-other-grid">{otherAreas.map((item) => <button key={item.slug} className="cp-other reveal-up" onClick={() => navigate(`/areas/${item.slug}`)}><CityMap slug={item.slug} name={item.name} /><span className="cp-other-top"><MapPin size={16} /> {areaDetails[item.slug].postcodes}</span><strong>{item.name}</strong><span className="cp-other-text">{item.blurb}</span><span className="cp-other-places">{areaDetails[item.slug].places.slice(0, 4).map((place) => <i key={place}>{place}</i>)}</span><span className="cp-other-go">View {item.name} <ArrowRight size={15} /></span></button>)}</div></div></section>
    <CTA /></>;
}


const serviceLocal: Record<string, { use: string; noun: string }> = {
  'house-clearance': { use: 'clearing a family home, a rental after tenants leave or a cluttered loft', noun: 'house clearance' },
  'garden-waste-removal': { use: 'cutting back hedges, clearing a shed or tidying an overgrown garden', noun: 'garden waste removal' },
  'furniture-appliance-removal': { use: 'getting rid of an old sofa, mattress, wardrobe or washing machine', noun: 'furniture and appliance removal' },
  'moving-service': { use: 'moving home, or collecting and delivering a single bulky item', noun: 'moving help' },
  'office-commercial-clearance': { use: 'clearing an office, shop or unit with as little disruption to your business as possible', noun: 'office and commercial clearance' },
  'recycling-responsible-disposal': { use: 'making sure unwanted items are reused, donated or recycled rather than dumped', noun: 'recycling and responsible disposal' },
};

function CityServicePage({ slug, serviceSlug }: { slug?: string; serviceSlug?: string }) {
  const area = areas.find((item) => item.slug === slug) ?? areas[0];
  const service = services.find((item) => item.slug === serviceSlug);
  if (!service) return <AreaPage slug={slug} />;
  const detail = areaDetails[area.slug];
  const sd = serviceDetails[service.slug];
  const local = serviceLocal[service.slug];
  const Icon = service.icon;
  const serviceIndex = services.indexOf(service);
  const otherServices = services.filter((item) => item.slug !== service.slug);
  const otherCities = areas.filter((item) => item.slug !== area.slug);
  const spot = detail.spots[serviceIndex % detail.spots.length];
  const lead = `${area.name} ${local.noun}`;
  const topPlaces = detail.places.slice(0, 3).join(', ');
  const quick = `Xpress Waste Removals provides ${local.noun} in ${area.name}, covering every ${detail.prefix} postcode including ${topPlaces}. We are a licensed, fully insured waste carrier. Request a free, no-obligation quote with your postcode and we will give you a clear, upfront price with no hidden fees.`;
  const faqs = [
    { q: `How much does ${local.noun} cost in ${area.name}?`, a: `The price depends on how much needs to go and how easy it is to access. Send your ${area.name} postcode and a few details through our free quote form and we will give you a clear, upfront price before we start, with no hidden fees.` },
    { q: `Do you cover all of ${area.name} for ${local.noun}?`, a: `Yes. We cover all areas of ${area.name}, across every ${detail.prefix} postcode, including ${detail.places.join(', ')}.` },
    { q: `What can you take as part of ${local.noun} in ${area.name}?`, a: `Typical items include ${(sd?.takes ?? service.bullets).map((t) => t.toLowerCase()).join(', ')}. If your item is not listed, ask us and we will let you know.` },
    { q: `Is Xpress Waste Removals a licensed waste carrier in ${area.name}?`, a: 'Yes. Xpress Waste Removals is a licensed waste carrier and is fully insured, so your waste is collected and disposed of legally and responsibly.' },
    { q: `Do you recycle what you collect in ${area.name}?`, a: 'Yes. We reuse, donate and recycle wherever possible before anything is sent for disposal.' },
    ...(sd?.faqs.slice(0, 2) ?? []),
  ];
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const graph = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
        { '@type': 'ListItem', position: 2, name: area.name, item: `${origin}/#/areas/${area.slug}` },
        { '@type': 'ListItem', position: 3, name: service.title, item: `${origin}/#/areas/${area.slug}/${service.slug}` },
      ] },
      { '@type': 'Service', name: `${service.title} in ${area.name}`, serviceType: service.title, description: service.description, areaServed: { '@type': 'City', name: area.name }, provider: { '@type': 'LocalBusiness', name: 'Xpress Waste Removals' } },
      { '@type': 'FAQPage', mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) },
    ],
  }).replace(/</g, '\\u003c');
  const facts: [string, string][] = [
    ['Service', service.title], ['Area covered', `All of ${area.name} (${detail.postcodes})`], ['Pricing', 'Free, no-obligation quote with clear upfront pricing'],
    ['Licensing', 'Licensed waste carrier, fully insured'], ['Waste handling', 'Reuse, donate and recycle first'], ['How to book', 'Request a quote online with your postcode'],
  ];
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: graph }} />
    <section className="hero hero-x hero-inner"><div className="container hx-grid"><div className="hx-copy"><div className="eyebrow"><span className="eyebrow-dot" /> {area.name} · {service.eyebrow}</div><nav className="breadcrumb" aria-label="Breadcrumb"><a href="#/">Home</a> <ChevronRight size={14} /> <a href="#/areas">Areas</a> <ChevronRight size={14} /> <a href={`#/areas/${area.slug}`}>{area.name}</a> <ChevronRight size={14} /> {service.title}</nav><h1>{service.title}<br /><em>in {area.name}.</em></h1><p>{service.description} Serving every {detail.prefix} postcode across {area.name}.</p><div className="hero-actions tight"><button className="button button-primary" onClick={() => navigate(`/quote?service=${service.slug}&postcode=${detail.prefix}`)}>Get a free quote <ArrowRight size={18} /></button><a className="hero-phone" href={`tel:${PHONE}`}><Phone size={16} /> {PHONE}</a></div><div className="hero-points"><span><MapPin size={15} /> {detail.postcodes}</span><span><ShieldCheck size={15} /> Licensed &amp; insured</span><span><Recycle size={15} /> Recycled where possible</span></div></div><InnerHeroVisual main={serviceHeroImages[service.slug]} small={detail.image} badge={{ icon: <Icon size={20} />, title: area.name, text: service.title }} /></div></section>

    <section className="cp-stats"><div className="container cp-stats-grid">
      <div><span className="cp-stat-ic"><MapPin size={20} /></span><strong>{detail.prefix}</strong><small>{detail.postcodes}</small></div>
      <div><span className="cp-stat-ic"><ShieldCheck size={20} /></span><strong>Insured</strong><small>Licensed waste carrier</small></div>
      <div><span className="cp-stat-ic"><ClipboardList size={20} /></span><strong>Upfront</strong><small>Clear pricing, no hidden fees</small></div>
      <div><span className="cp-stat-ic"><FileCheck2 size={20} /></span><strong>Free</strong><small>No-obligation quote</small></div>
    </div></section>

    <section className="section sv-answer-wrap"><div className="container"><div className="sv-answer reveal-up"><span className="sv-answer-ic"><Sparkles size={20} /></span><div><div className="eyebrow dark">Quick answer</div><h2>Who provides {local.noun} in {area.name}?</h2><p>{quick}</p></div></div></div></section>

    <section className="section detail-section cp-local" style={{ paddingTop: 20 }}><div className="container cp-local-grid">
      <div className="reveal-up"><div className="eyebrow dark">{lead}</div><h2>Done properly,<br /><span>right across {area.name}.</span></h2><p className="large-copy">Whether you are {local.use}, our {area.name} team handles the lifting, loading and removal. We work across {topPlaces} and every other part of {area.name}, and we sort each load responsibly.</p><p className="cp-feel">{sd?.intro} In {spot.name}, for example, we regularly help with {spot.note.toLowerCase()}.</p><ul className="cp-checks sv-checks">{service.bullets.map((bullet) => <li key={bullet}><span><Check size={14} /></span>{bullet}</li>)}</ul><div className="cp-local-actions"><button className="button button-primary" onClick={() => navigate(`/quote?service=${service.slug}&postcode=${detail.prefix}`)}>Get a free quote <ArrowRight size={17} /></button><button className="text-button" type="button" onClick={() => navigate(`/services/${service.slug}`)}>About this service <ChevronRight size={16} /></button></div></div>
      <aside className="cp-card reveal-up" aria-label={`${service.title} facts for ${area.name}`}><div className="cp-card-glow" aria-hidden="true" /><div className="cp-card-top"><span><Icon size={16} /> At a glance</span><em>{area.name}</em></div><dl className="sv-facts">{facts.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl></aside>
    </div></section>

    {sd && <section className="section alt-section"><div className="container"><div className="section-heading reveal-up"><div><div className="eyebrow dark">Typical items</div><h2>What we regularly<br /><span>take in {area.name}.</span></h2></div><p>Not on the list? Ask us. If it needs to go, there is a good chance we can take it.</p></div><div className="sv-items">{sd.takes.map((item, index) => <div key={item} className="sv-item reveal-up"><span className="sv-item-ic"><Check size={16} /></span><strong>{item}</strong><em>0{index + 1}</em></div>)}</div></div></section>}

    <section className="section cp-spots"><div className="container"><div className="section-heading reveal-up"><div><div className="eyebrow dark">Areas we serve</div><h2>{service.title} across<br /><span>all of {area.name}.</span></h2></div><p>We cover every area of {area.name}. These are some of the neighbourhoods we visit most.</p></div><div className="cp-spot-grid">{detail.spots.map((item, index) => <div key={item.name} className="cp-spot reveal-up"><span className="cp-spot-pin"><MapPin size={18} /></span><div><strong>{item.name}</strong><small>{local.noun.charAt(0).toUpperCase() + local.noun.slice(1)} in {item.name}</small></div><em>0{index + 1}</em></div>)}</div></div></section>

    <section className="cp-steps"><div className="container"><div className="section-heading reveal-up"><div><div className="eyebrow">How it works</div><h2>Four easy steps.<br /><span>Zero stress.</span></h2></div></div><div className="cp-step-grid">{howSteps.map((step, index) => { const StepIcon = step.icon; return <div key={step.title} className="cp-step reveal-up"><span className="cp-step-ic"><StepIcon size={22} /></span><h3>{step.title}</h3><p>{step.text}</p></div>; })}</div></div></section>

    <section className="section quote-home sv-quote"><div className="container quote-home-inner"><div className="quote-home-copy reveal-up"><div className="eyebrow dark">Free quote</div><h2>{service.title} in {area.name}<br /><span>starts with a quote.</span></h2><p>Tell us what needs to go and where in {area.name} you are. We will come back with a clear, upfront price. It is free and there is no obligation.</p><ul className="quote-home-points"><li><ShieldCheck size={18} /> No obligation, ever</li><li><Check size={18} /> Clear upfront pricing</li><li><MapPin size={18} /> All of {area.name}</li></ul><div className="quote-home-stats"><div><strong>4.9★</strong><small>900+ reviews</small></div><div><strong>Same-day</strong><small>slots available</small></div><div><strong>Licensed</strong><small>&amp; fully insured</small></div></div><a className="sv-call" href={`tel:${PHONE}`}><span><Phone size={18} /></span><div><small>Prefer to talk?</small><strong>{PHONE}</strong></div></a></div><div className="quote-card quote-card-home reveal-up"><QuoteForm preset={service.slug} presetPostcode={detail.prefix} /></div></div></section>

    <section className="section faq-section cp-faq"><div className="container faq-layout"><div><div className="eyebrow dark">Good to know</div><h2>{area.name}<br /><span>questions.</span></h2><p className="faq-side">Need a hand? Call us on <a href={`tel:${PHONE}`}>{PHONE}</a>.</p></div><div className="faq-list">{faqs.map((faq) => <details key={faq.q}><summary>{faq.q}<ChevronDown size={18} /></summary><p>{faq.a}</p></details>)}</div></div></section>

    <section className="section alt-section"><div className="container"><div className="section-heading reveal-up"><div><div className="eyebrow dark">More in {area.name}</div><h2>Other services<br /><span>in {area.name}.</span></h2></div><p>One local team for homes, gardens, offices and moves.</p></div><div className="cp-service-grid">{otherServices.map((item, index) => { const ItemIcon = item.icon; return <button key={item.slug} className={`cp-service accent-${item.accent} reveal-up`} onClick={() => navigate(`/areas/${area.slug}/${item.slug}`)}><span className="cp-service-ic"><ItemIcon size={22} /></span><strong>{item.title} in {area.name}</strong><small>{item.description}</small><span className="cp-service-go">Find out more <ArrowRight size={15} /></span></button>; })}</div></div></section>

    <section className="section cp-others"><div className="container"><div className="section-heading compact reveal-up"><div><div className="eyebrow dark">Also covering</div><h2>{service.title} in<br /><span>our other cities.</span></h2></div></div><div className="cp-other-grid">{otherCities.map((item) => <button key={item.slug} className="cp-other reveal-up" onClick={() => navigate(`/areas/${item.slug}/${service.slug}`)}><CityMap slug={item.slug} name={item.name} /><span className="cp-other-top"><MapPin size={16} /> {areaDetails[item.slug].postcodes}</span><strong>{service.title} in {item.name}</strong><span className="cp-other-text">{item.blurb}</span><span className="cp-other-go">View {item.name} <ArrowRight size={15} /></span></button>)}</div></div></section>
    <CTA /></>;
}

function IndexHero({ eyebrow, crumb, title, accent, text, badge }: { eyebrow: string; crumb: string; title: string; accent: string; text: string; badge: { icon: ReactNode; title: string; text: string } }) {
  return <section className="hero hero-x hero-inner"><div className="container hx-grid"><div className="hx-copy"><div className="eyebrow"><span className="eyebrow-dot" /> {eyebrow}</div><nav className="breadcrumb" aria-label="Breadcrumb"><a href="#/">Home</a> <ChevronRight size={14} /> {crumb}</nav><h1>{title}<br /><em>{accent}</em></h1><p>{text}</p><div className="hero-actions tight"><button className="button button-primary" onClick={() => navigate('/quote')}>Get a free quote <ArrowRight size={18} /></button><a className="hero-phone" href={`tel:${PHONE}`}><Phone size={16} /> {PHONE}</a></div><div className="hero-points"><span><ShieldCheck size={15} /> Licensed &amp; insured</span><span><Zap size={15} /> Clear upfront pricing</span><span><Recycle size={15} /> Recycled where possible</span></div></div><InnerHeroVisual main={heroSlides[0]} small={heroSlides[1]} badge={badge} /></div></section>;
}

function CityServiceMatrix() {
  return <div className="ix-matrix" role="table" aria-label="Services by city">
    <div className="ix-row ix-head" role="row"><span role="columnheader">Service</span>{areas.map((a) => <span key={a.slug} role="columnheader">{a.name}</span>)}</div>
    {services.map((item) => { const Icon = item.icon; return <div className="ix-row reveal-up" role="row" key={item.slug}><span className="ix-name" role="cell"><i><Icon size={18} /></i>{item.title}</span>{areas.map((a) => <button key={a.slug} role="cell" type="button" onClick={() => navigate(`/areas/${a.slug}/${item.slug}`)}>{item.title} in {a.name}<ArrowRight size={14} /></button>)}</div>; })}
  </div>;
}

function ServicesIndexPage() {
  const faqs = [
    { q: 'What services does Xpress Waste Removals offer?', a: `We offer ${services.map((x) => x.title.toLowerCase()).join(', ')}.` },
    { q: 'Which cities do you serve?', a: 'We provide all of our services across every area of Coventry, Leicester and Birmingham.' },
    { q: 'How do I get a price?', a: 'Request a free quote online with your postcode and what needs to go. We give you a clear, upfront price with no hidden fees and no obligation.' },
    { q: 'Are you a licensed waste carrier?', a: 'Yes. Xpress Waste Removals is a licensed waste carrier and is fully insured, so your waste is collected and disposed of legally and responsibly.' },
    { q: 'What happens to the waste you collect?', a: 'We reuse, donate and recycle wherever possible before anything is sent for disposal.' },
  ];
  const graph = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'ItemList', name: 'Xpress Waste Removals services', itemListElement: services.map((x, i) => ({ '@type': 'ListItem', position: i + 1, name: x.title, url: `${typeof window !== 'undefined' ? window.location.origin : ''}/#/services/${x.slug}` })) },
      { '@type': 'FAQPage', mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) },
    ],
  }).replace(/</g, '\\u003c');
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: graph }} />
    <IndexHero eyebrow="Everything we do" crumb="Services" title="Our services." accent="Every clear-out covered." text="From a single sofa to a whole property, one local team handles homes, gardens, offices and moves across Coventry, Leicester and Birmingham." badge={{ icon: <Truck size={20} />, title: `${services.length} services`, text: 'One local team' }} />
    <section className="cp-stats"><div className="container cp-stats-grid">
      <div><span className="cp-stat-ic"><Truck size={20} /></span><strong>{services.length}</strong><small>Services available</small></div>
      <div><span className="cp-stat-ic"><MapPin size={20} /></span><strong>{areas.length}</strong><small>Cities covered</small></div>
      <div><span className="cp-stat-ic"><ClipboardList size={20} /></span><strong>Upfront</strong><small>Clear pricing, no hidden fees</small></div>
      <div><span className="cp-stat-ic"><FileCheck2 size={20} /></span><strong>Free</strong><small>No-obligation quote</small></div>
    </div></section>
    <section className="section"><div className="container"><div className="section-heading reveal-up"><div><div className="eyebrow dark">What we do</div><h2>Big clear-outs.<br /><span>Small amount of fuss.</span></h2></div><p>Pick a service to see what is included, what we take and the questions people ask most.</p></div><div className="service-grid">{services.map((item, index) => <ServiceCard service={item} index={index} key={item.slug} photo={serviceCardImages[item.slug]} />)}</div></div></section>
    <section className="section alt-section"><div className="container"><div className="section-heading reveal-up"><div><div className="eyebrow dark">Not sure which one?</div><h2>Find the right<br /><span>service for the job.</span></h2></div><p>Match what you need to the service that fits.</p></div><div className="ix-finder">{services.map((item) => { const Icon = item.icon; return <button key={item.slug} className="ix-find reveal-up" onClick={() => navigate(`/services/${item.slug}`)}><span className="ix-find-ic"><Icon size={20} /></span><span><small>I need help with</small><strong>{serviceLocal[item.slug]?.use}</strong></span><ChevronRight size={18} /></button>; })}</div></div></section>
    <section className="section"><div className="container"><div className="section-heading reveal-up"><div><div className="eyebrow dark">Service by city</div><h2>Every service.<br /><span>Every city.</span></h2></div><p>Choose your city to see the local page for each service.</p></div><CityServiceMatrix /></div></section>
    <section className="section faq-section cp-faq"><div className="container faq-layout"><div><div className="eyebrow dark">Good to know</div><h2>Services<br /><span>questions.</span></h2><p className="faq-side">Need a hand? Call us on <a href={`tel:${PHONE}`}>{PHONE}</a>.</p></div><div className="faq-list">{faqs.map((faq) => <details key={faq.q}><summary>{faq.q}<ChevronDown size={18} /></summary><p>{faq.a}</p></details>)}</div></div></section>
    <CTA /></>;
}

function AreasIndexPage() {
  const faqs = [
    { q: 'Which areas does Xpress Waste Removals cover?', a: 'We cover all areas of Coventry, Leicester and Birmingham, across every CV, LE and B postcode.' },
    ...areas.map((a) => ({ q: `Do you cover all of ${a.name}?`, a: `Yes. We cover every area of ${a.name}, including ${areaDetails[a.slug].places.join(', ')}.` })),
    { q: 'How do I get a quote in my area?', a: 'Request a free quote online with your postcode and what needs to go. We give you a clear, upfront price with no hidden fees and no obligation.' },
  ];
  const graph = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'LocalBusiness', name: 'Xpress Waste Removals', areaServed: areas.map((a) => ({ '@type': 'City', name: a.name })) },
      { '@type': 'FAQPage', mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) },
    ],
  }).replace(/</g, '\\u003c');
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: graph }} />
    <IndexHero eyebrow="Where we work" crumb="Areas" title="Areas we cover." accent="All of three cities." text="Your local clearance team for every area of Coventry, Leicester and Birmingham, from the city centre to the suburbs." badge={{ icon: <MapPin size={20} />, title: `${areas.length} cities`, text: 'Every area covered' }} />
    <section className="cp-stats"><div className="container cp-stats-grid">
      {areas.map((a) => <div key={a.slug}><span className="cp-stat-ic"><MapPin size={20} /></span><strong>{areaDetails[a.slug].prefix}</strong><small>{a.name}: {areaDetails[a.slug].postcodes}</small></div>)}
      <div><span className="cp-stat-ic"><Truck size={20} /></span><strong>{services.length}</strong><small>Services in every city</small></div>
    </div></section>
    <section className="section"><div className="container"><div className="section-heading reveal-up"><div><div className="eyebrow dark">Pick your city</div><h2>Your local team in<br /><span>three cities.</span></h2></div><p>Choose your city to see local neighbourhoods, services and questions.</p></div><div className="cp-other-grid ix-cities">{areas.map((a) => <button key={a.slug} className="cp-other reveal-up" onClick={() => navigate(`/areas/${a.slug}`)}><CityMap slug={a.slug} name={a.name} /><span className="cp-other-top"><MapPin size={16} /> {areaDetails[a.slug].postcodes}</span><strong>{a.name}</strong><span className="cp-other-text">{a.blurb}</span><span className="cp-other-places">{areaDetails[a.slug].places.map((place) => <i key={place}>{place}</i>)}</span><span className="cp-other-go">View {a.name} <ArrowRight size={15} /></span></button>)}</div></div></section>
    <section className="section alt-section"><div className="container"><div className="section-heading reveal-up"><div><div className="eyebrow dark">Local service pages</div><h2>Every service.<br /><span>Every city.</span></h2></div><p>Jump straight to the service you need in your city.</p></div><CityServiceMatrix /></div></section>
    <section className="section faq-section cp-faq"><div className="container faq-layout"><div><div className="eyebrow dark">Good to know</div><h2>Coverage<br /><span>questions.</span></h2><p className="faq-side">Need a hand? Call us on <a href={`tel:${PHONE}`}>{PHONE}</a>.</p></div><div className="faq-list">{faqs.map((faq) => <details key={faq.q}><summary>{faq.q}<ChevronDown size={18} /></summary><p>{faq.a}</p></details>)}</div></div></section>
    <CTA /></>;
}

/** Quote requests are emailed to this address (via FormSubmit, no API key needed). */
const QUOTE_EMAIL_ENDPOINT = 'https://formsubmit.co/ajax/abdullahspare786@gmail.com';

function QuoteForm({ preset, presetPostcode, presetSize }: { preset?: string; presetPostcode?: string; presetSize?: string }) {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', email: '', phone: '', postcode: presetPostcode ?? '', service: services.find((item) => item.slug === preset)?.title ?? '', message: loadSizes.find((item) => item.key === presetSize) ? `Estimated load: ${loadSizes.find((item) => item.key === presetSize)?.label} (${loadSizes.find((item) => item.key === presetSize)?.van}).` : '' });
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setLoading(true);
    // Backup copy in Supabase (optional: only if configured; never blocks the email).
    if (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY) {
      void Promise.resolve(supabase.from('quote_requests').insert(form)).catch(() => undefined);
    }
    let sent = false;
    try {
      const response = await fetch(QUOTE_EMAIL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          _subject: `New free quote request: ${form.service} (${form.postcode})`,
          _template: 'table',
          _honey: '',
          'Full name': form.name,
          'Phone number': form.phone,
          'Email address': form.email,
          Postcode: form.postcode,
          Service: form.service,
          Message: form.message || '(none)',
          'Submitted at': new Date().toLocaleString('en-GB'),
          email: form.email,
        }),
      });
      const result = await response.json().catch(() => ({}));
      sent = response.ok && result.success !== 'false' && result.success !== false;
    } catch { sent = false; }
    setLoading(false);
    if (!sent) { setError(`We could not send that just now. Please call us on ${PHONE}.`); return; }
    setSubmitted(true);
  }
  if (submitted) return <div className="success-state"><span className="success-icon"><Check size={30} /></span><div className="eyebrow dark">Quote request received</div><h2>We’ll be in touch<br /><span>very soon.</span></h2><p>Thanks for choosing Xpress Waste Removals. A member of our team will contact you with your clear, no-obligation quote.</p><button className="button button-dark" onClick={() => { setSubmitted(false); setForm({ name: '', email: '', phone: '', postcode: '', service: '', message: '' }); }}>Send another request <ArrowRight size={17} /></button></div>;
  return <form onSubmit={submit}><div className="form-top"><span className="form-top-step"><em>1</em>Your details</span><span className="form-top-badge"><Check size={12} /> Free &amp; no obligation</span></div><div className="form-row"><label>Full name<input required value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="Your name" /></label><label>Phone number<input required value={form.phone} onChange={(event) => update('phone', event.target.value)} placeholder="07..." /></label></div><div className="form-row"><label>Email address<input type="email" required value={form.email} onChange={(event) => update('email', event.target.value)} placeholder="you@example.com" /></label><label>Postcode<input required value={form.postcode} onChange={(event) => update('postcode', event.target.value)} placeholder="CV1 1AA" /></label></div><label>What can we help with?<select required value={form.service} onChange={(event) => update('service', event.target.value)}><option value="">Choose a service</option>{services.map((service) => <option key={service.slug} value={service.title}>{service.title}</option>)}</select></label><label>Tell us a little more <textarea value={form.message} onChange={(event) => update('message', event.target.value)} placeholder="What needs removing? Any access details we should know?" rows={4} /></label>{error && <div className="form-error">{error}</div>}<button disabled={loading} className="button button-primary full-button" type="submit">{loading ? 'Sending your request...' : 'Send my free quote request'} <Send size={17} /></button><small className="privacy-note"><ShieldCheck size={14} /> Your details are only used to respond to your enquiry.</small></form>;
}

function QuotePage({ preset, presetPostcode, presetSize }: { preset?: string; presetPostcode?: string; presetSize?: string }) {
  return <section className="quote-page"><div className="quote-layout container"><div className="quote-intro"><div className="eyebrow"><span className="eyebrow-dot" /> No pressure, just a clear price</div><h1>Let’s clear<br /><em>the way.</em></h1><p>Tell us a little about what you need removing and we will get back to you with a free, no-obligation quote.</p><div className="quote-note"><Sparkles size={20} /><span><strong>Free, no-obligation quote</strong><small>Clear upfront pricing, no hidden fees.</small></span></div><ol className="quote-steps"><li><b>1</b> Send your details</li><li><b>2</b> Get a clear price</li><li><b>3</b> We collect &amp; clear</li></ol><div className="quote-contact"><span>Prefer to talk?</span><a href={`tel:${PHONE}`}><Phone size={17} /> {PHONE}</a></div></div><div className="quote-card reveal-up"><QuoteForm preset={preset} presetPostcode={presetPostcode} presetSize={presetSize} /></div></div></section>;
}

function CTA() {
  return (
    <section className="cta-section" aria-labelledby="cta-heading">
      <div className="container cta-inner">
        <div>
          <div className="eyebrow">Ready when you are</div>
          <h2 id="cta-heading">Make room for<br /><em>what matters.</em></h2>
        </div>
        <div>
          <p>Tell us what needs to go and where you are. We cover Coventry, Leicester and Birmingham.</p>
          <button className="button button-light" onClick={() => navigate('/quote')}>
            Get your free quote <ArrowRight size={18} />
          </button>
          <p className="cta-phone">Prefer to talk? Call <a href={`tel:${PHONE}`}>{PHONE}</a>.</p>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return <footer className="footer">
    <div className="footer-glow" aria-hidden="true" />
    <div className="container footer-grid">
      <div className="footer-about">
        <button className="brand footer-brand" onClick={() => navigate('/')}><BrandLogo className="brand-logo" /></button>
        <p>Reliable waste removal with a lighter footprint. Serving the Midlands with care.</p>
        <div className="footer-socials">
          <span role="img" aria-label="LinkedIn">in</span>
          <span role="img" aria-label="Facebook">f</span>
          <span role="img" aria-label="Instagram">◎</span>
        </div>
        <button className="footer-quote" onClick={() => navigate('/quote')}>Get a free quote <ArrowRight size={15} /></button>
      </div>
      <div>
        <strong>Services</strong>
        {services.map((service) => <button key={service.slug} onClick={() => navigate(`/services/${service.slug}`)}><ChevronRight size={13} /> {service.title}</button>)}
      </div>
      <div>
        <strong>Areas we cover</strong>
        {areas.map((area) => <button key={area.slug} onClick={() => navigate(`/areas/${area.slug}`)}><MapPin size={13} /> {area.name}</button>)}
      </div>
      <div>
        <strong>Get in touch</strong>
        <a href={`tel:${PHONE}`}><Phone size={14} /> {PHONE}</a>
        <a href="mailto:hello@xpresswaste.co.uk"><Mail size={14} /> hello@xpresswaste.co.uk</a>
      </div>
    </div>
    <div className="container footer-bottom">
      <span>© 2025 Xpress Waste Removals. All rights reserved.</span>
      <span>Reuse and recycle first</span>
    </div>
  </footer>;
}

export default App;
