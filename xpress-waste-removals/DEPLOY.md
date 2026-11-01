# Deploy to Google (Firebase Hosting)

1. Install Node.js (LTS) from nodejs.org
2. In this folder run:
   npm install
   npm run build
3. Install and log in to Firebase:
   npm install -g firebase-tools
   firebase login
   firebase init hosting   (choose your project, public directory: dist, single-page app: No, do not overwrite index.html)
4. Deploy:
   firebase deploy --only hosting

The site uses hash routes (/#/quote), so no rewrite rules are needed.
The dist folder created by "npm run build" is also what you upload to any other static host (Google Cloud Storage, Netlify, Vercel).
Your Supabase keys are in .env and are built into the site at build time.
