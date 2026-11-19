# Xpress Waste Removals

Website for Xpress Waste Removals: rubbish and waste removal in Coventry, Leicester and Birmingham. It has a home page, six service pages, three city pages and a free quote form.

## Tech stack
- React 18 + TypeScript, built with Vite
- Tailwind CSS (base styles) and custom CSS in `src/index.css`
- Supabase (stores quote requests), lucide-react icons
- Hash-based routing (for example `/#/quote`), so no server rewrite rules are needed

## Folder structure
```
xpress-waste-removals/
├── public/            images (webp), logo.png
├── src/
│   ├── App.tsx        pages, routes and components
│   ├── index.css      all styling
│   ├── main.tsx       entry point
│   └── lib/           motion helpers, Supabase client
├── supabase/migrations/   database schema for quote requests
├── .env.example       required environment variables (placeholders)
├── index.html
├── package.json / package-lock.json
└── vite.config.ts
```

## Prerequisites
- Node.js 20.19 or newer (LTS) and npm

## Run locally
```
npm install
cp .env.example .env     # Windows: copy .env.example .env  then add your real values
npm run dev
```
Open http://localhost:5173. To test on your phone: `npm run dev -- --host`.

## Other commands
- `npm run build`: production build into `dist/`
- `npm run preview`: preview the production build locally
- `npm run typecheck` and `npm run lint`

## Environment variables
| Name | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon (public) key |

Never commit a real `.env`. It is listed in `.gitignore`. If these are missing the site still loads, but the quote form cannot submit.

## Upload to GitHub
Using Git (recommended, it respects `.gitignore`):
```
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
git push -u origin main
```
If you use the GitHub website upload instead, upload the contents of this folder, but NOT `node_modules`, `dist` or `.env` (the website upload does not apply `.gitignore`).

## Deploy to Vercel
1. Vercel -> Add New -> Project -> import the GitHub repo.
2. Vercel detects Vite automatically (Framework Preset: Vite, Install command `npm install`, Build command `npm run build`, Output directory `dist`). No `vercel.json` is needed because the site uses hash routes (`/#/quote`), so direct links and page refreshes work without rewrites. In Project Settings -> General, keep Node.js at 20.x or newer (the project requires 20.19+).
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` under Environment Variables, then Deploy.
4. Add your domain in Project Settings -> Domains and set the DNS records Vercel shows.

## Important notes
- Supabase: the policies in `supabase/migrations` currently allow public read, update and delete on `quote_requests`. Restrict them to insert-only for the public before going live, otherwise customer details are exposed.
- Phone: set `const PHONE = 'REPLACE_ME'` near the top of `src/App.tsx`. Email and social links are also placeholders.
