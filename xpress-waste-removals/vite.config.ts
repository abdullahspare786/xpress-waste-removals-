import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const SITE_URL = 'https://www.xpresswasteremoval.co.uk';
const PHONE = '07418628510';

const SEO_SERVICES = [
  { slug: 'house-clearance', title: 'House clearance', desc: 'Same-day and scheduled UK house clearance — from a single room or loft to full probate and end-of-tenancy property clear-outs.' },
  { slug: 'garden-waste-removal', title: 'Garden waste removal', desc: 'Licensed garden waste clearance for green waste, hedge trimmings, branches, soil, rubble and old sheds — easier than hiring a skip.' },
  { slug: 'furniture-appliance-removal', title: 'Furniture & appliance removal', desc: 'Fast man-and-van sofa, mattress, furniture and WEEE appliance disposal. We lift, carry and recycle without heavy lifting for you.' },
  { slug: 'moving-service', title: 'Moving service', desc: 'Reliable local man-and-van moving help for flat moves, student moves, marketplace pickups and bulky single-item deliveries.' },
  { slug: 'office-commercial-clearance', title: 'Office & commercial clearance', desc: 'Licensed commercial waste clearance for offices, shops, warehouses, landlords and builders waste — with Waste Transfer Notes included.' },
  { slug: 'recycling-responsible-disposal', title: 'Recycling & responsible disposal', desc: 'Environment Agency licensed rubbish disposal with reuse and recycling first — diverting wood, metal, electricals and furniture from UK landfill.' },
];

const SEO_AREAS = [
  { slug: 'coventry', name: 'Coventry', prefix: 'CV' },
  { slug: 'leicester', name: 'Leicester', prefix: 'LE' },
  { slug: 'birmingham', name: 'Birmingham', prefix: 'B' },
];

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Generates per-route static index.html files in dist/ so crawlers get exact canonical, title & meta tags on first byte. */
function seoStaticRoutesPlugin(): Plugin {
  return {
    name: 'seo-static-routes',
    closeBundle() {
      const distDir = fileURLToPath(new URL('./dist', import.meta.url));
      const baseHtmlPath = path.join(distDir, 'index.html');
      if (!fs.existsSync(baseHtmlPath)) return;
      const baseHtml = fs.readFileSync(baseHtmlPath, 'utf-8');

      type RouteMeta = { route: string; title: string; description: string; h1: string };
      const routes: RouteMeta[] = [
        {
          route: '/services',
          title: 'Waste Removal Services UK | House, Garden & Commercial Clearance | Xpress Waste Removals',
          description: 'Full UK waste removal services: house clearance, garden waste removal, furniture & appliance disposal, office clearance, moving help & recycling across Coventry, Leicester & Birmingham.',
          h1: 'UK Waste Removal & Rubbish Clearance Services',
        },
        {
          route: '/areas',
          title: 'Areas We Cover | Rubbish Removal Coventry, Leicester & Birmingham | Xpress Waste Removals',
          description: 'Environment Agency licensed rubbish removal across every CV, LE and B postcode in Coventry, Leicester and Birmingham. Same-day waste clearance & free upfront quotes.',
          h1: 'UK Rubbish Removal Areas: Coventry, Leicester & Birmingham',
        },
        {
          route: '/quote',
          title: 'Free Waste Removal Quote UK | Clear Upfront Pricing | Xpress Waste Removals',
          description: `Request a free, no-obligation rubbish removal quote across Coventry, Leicester and Birmingham. Same-day collections, no hidden fees. Call ${PHONE} or book online.`,
          h1: 'Get a Free UK Waste Removal Quote',
        },
        ...SEO_SERVICES.map((s) => ({
          route: `/services/${s.slug}`,
          title: `${s.title} UK | Coventry, Leicester & Birmingham | Xpress Waste Removals`,
          description: `Licensed ${s.title.toLowerCase()} across Coventry, Leicester and Birmingham. ${s.desc} Faster than skip hire — call ${PHONE} for a free quote.`,
          h1: `${s.title} in Coventry, Leicester & Birmingham`,
        })),
        ...SEO_AREAS.map((a) => ({
          route: `/areas/${a.slug}`,
          title: `Rubbish Removal ${a.name} | Same-Day Waste Clearance (${a.prefix}) | Xpress Waste Removals`,
          description: `Licensed rubbish removal & house clearance in ${a.name} across all ${a.prefix} postcodes. Garden waste, furniture disposal & commercial clearances — free quote on ${PHONE}.`,
          h1: `Rubbish Removal & Waste Clearance in ${a.name} (${a.prefix})`,
        })),
        ...SEO_AREAS.flatMap((a) =>
          SEO_SERVICES.map((s) => ({
            route: `/areas/${a.slug}/${s.slug}`,
            title: `${s.title} in ${a.name} | Same-Day Waste Clearance | Xpress Waste Removals`,
            description: `Licensed ${s.title.toLowerCase()} in ${a.name} covering every ${a.prefix} postcode. Faster & easier than skip hire, with clear upfront pricing. Call ${PHONE} for a free quote.`,
            h1: `${s.title} in ${a.name}`,
          }))
        ),
      ];

      for (const item of routes) {
        const canonical = `${SITE_URL}${item.route}`;
        const t = escapeHtml(item.title);
        const d = escapeHtml(item.description);
        const segments = item.route.split('/').filter(Boolean);
        const crumbItems = [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
          ...segments.map((seg, idx) => ({
            '@type': 'ListItem',
            position: idx + 2,
            name: seg.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
            item: `${SITE_URL}/${segments.slice(0, idx + 1).join('/')}`,
          })),
        ];
        const routeSchema = `<script type="application/ld+json">${JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: crumbItems,
        }).replace(/</g, '\\u003c')}</script>`;

        let html = baseHtml
          .replace(/<title>[\s\S]*?<\/title>/, `<title>${t}</title>`)
          .replace(/<meta name="description" content="[^"]*"\s*\/>/, `<meta name="description" content="${d}" />`)
          .replace(/<link rel="canonical" href="[^"]*"\s*\/>/, `<link rel="canonical" href="${canonical}" />`)
          .replace(/<link rel="alternate" hreflang="en-GB" href="[^"]*"\s*\/>/, `<link rel="alternate" hreflang="en-GB" href="${canonical}" />`)
          .replace(/<link rel="alternate" hreflang="x-default" href="[^"]*"\s*\/>/, `<link rel="alternate" hreflang="x-default" href="${canonical}" />`)
          .replace(/<meta property="og:title" content="[^"]*"\s*\/>/, `<meta property="og:title" content="${t}" />`)
          .replace(/<meta property="og:description" content="[^"]*"\s*\/>/, `<meta property="og:description" content="${d}" />`)
          .replace(/<meta property="og:url" content="[^"]*"\s*\/>/, `<meta property="og:url" content="${canonical}" />`)
          .replace(/<meta name="twitter:title" content="[^"]*"\s*\/>/, `<meta name="twitter:title" content="${t}" />`)
          .replace(/<meta name="twitter:description" content="[^"]*"\s*\/>/, `<meta name="twitter:description" content="${d}" />`)
          .replace(/<h1>[\s\S]*?<\/h1>/, `<h1>${escapeHtml(item.h1)}</h1>`)
          .replace('</head>', `  ${routeSchema}\n  </head>`);

        const outDir = path.join(distDir, item.route.replace(/^\//, ''));
        fs.mkdirSync(outDir, { recursive: true });
        fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf-8');
      }
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), seoStaticRoutesPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
