# WealthFlow Frontend

A single-page PWA built with vanilla JavaScript, Tailwind CSS, and Chart.js.

## Features

- JWT authentication with login/register
- Dashboard with spending trends and category charts
- Expenses with smart quick-add, presets, recurring bills, CSV import
- Investments with allocation charts and broker sync
- Budgets with progress tracking
- Dark mode
- PWA support (offline caching, add to home screen)

## Configuration

Edit `app.js` and set your backend URL:

```javascript
const API_BASE = window.location.hostname === 'localhost' 
    ? '' 
    : 'https://your-backend-url.onrender.com';
```

## Local Development

```bash
# Serve with any static file server
python3 -m http.server 3000

# Or use the backend server (serves frontend too on localhost)
cd ../backend && python server.py
# Then open http://localhost:8000
```

## Deploy

### Vercel (Recommended)

1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel --prod`
3. Set your backend URL in `app.js`

### Netlify

1. Drag and drop this folder to [netlify.com](https://netlify.com)
2. Or use Netlify CLI: `npm i -g netlify-cli && netlify deploy --prod`

### GitHub Pages

1. Push this folder to a GitHub repo
2. Go to Settings → Pages → Source → main branch
3. Your site will be at `https://yourusername.github.io/repo-name`

### Render Static Site

1. Create a new **Static Site** on Render
2. Connect your GitHub repo
3. Build command: leave empty
4. Publish directory: `.`

## PWA

The app includes:
- `manifest.json` — App icon, theme colors, display mode
- `service-worker.js` — Offline caching
- iOS meta tags — Add to home screen support

On iOS: Open the deployed URL in Safari → Share → Add to Home Screen.

## Files

```
frontend/
├── index.html          # App shell
├── app.js              # All logic, state, API calls
├── styles.css          # CSS custom properties theme
├── tailwind-config.js  # Tailwind customization
├── manifest.json       # PWA manifest
├── service-worker.js   # Offline caching
├── icon-192.png        # App icon
└── icon-512.png        # App icon
```
