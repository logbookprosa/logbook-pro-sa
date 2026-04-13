# Logbook Pro SA — Deployment Guide

## Quick Deploy to Vercel (Recommended)

### Step 1 — GitHub
1. Create a free account at github.com if you don't have one
2. Create a new repository called `logbook-pro-sa`
3. Upload all files from this folder into the repository
   - Drag and drop the files into the GitHub web interface
   - Or use GitHub Desktop app (easier)

### Step 2 — Vercel
1. Go to vercel.com and sign up with your GitHub account
2. Click **"Add New Project"**
3. Select your `logbook-pro-sa` repository
4. Vercel will auto-detect Vite — no settings to change
5. Click **"Deploy"**
6. Your app will be live at `logbook-pro-sa.vercel.app` in ~60 seconds

### Step 3 — Custom Domain (Optional)
1. In Vercel dashboard → your project → Settings → Domains
2. Add your own domain e.g. `logbookprosa.co.za`
3. Follow Vercel's DNS instructions for your domain registrar

---

## Local Development

```bash
npm install
npm run dev
```
Opens at http://localhost:5173

## Build for Production
```bash
npm run build
```
Output goes to `/dist` folder

---

## PWA — "Add to Home Screen"
Once deployed, users on mobile can:
- **iOS Safari:** Tap Share → "Add to Home Screen"
- **Android Chrome:** Tap menu → "Add to Home Screen" or "Install App"

The app will install like a native app with the Logbook Pro SA icon.

---

## App Icons
Place these in the `/public` folder:
- `favicon.ico` — browser tab icon (32×32)
- `icon-192.png` — PWA icon small (192×192)
- `icon-512.png` — PWA icon large (512×512)
- `apple-touch-icon.png` — iOS home screen icon (180×180)

Use your logo artwork to generate these at: https://realfavicongenerator.net

---

## Updating the App
1. Edit `src/App.jsx`
2. Commit and push to GitHub
3. Vercel automatically redeploys in ~30 seconds

## Releasing a New Beta Build
In `src/App.jsx` line 8:
```js
const APP_BUILD = "Beta 2";  // change this
```
Commit and push — done.

---

## File Structure
```
logbook-pro-sa/
├── public/
│   ├── favicon.ico
│   ├── icon-192.png
│   ├── icon-512.png
│   └── apple-touch-icon.png
├── src/
│   ├── App.jsx       ← entire app lives here
│   └── main.jsx      ← React entry point
├── index.html
├── package.json
├── vite.config.js
├── vercel.json
└── README.md
```
