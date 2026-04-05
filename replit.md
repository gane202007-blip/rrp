# PlastiCore AI

## Overview
PlastiCore AI is a Plastic Waste Reuse System. It classifies plastic waste (PET, HDPE, PVC, LDPE, PP, PS) using AI and maps classifications to construction material applications.

## Features
- **AI Reuse Suggestion System** — rule-based reuse ideas per plastic type, stored with each upload
- **Reward / Point System** — +10 pts per upload, badges (Beginner / Eco Hero / Champion)
- **Leaderboard** — top 10 users ranked by points
- **Nearby Recycler Finder** — Leaflet.js + OpenStreetMap + Overpass API to find local recycling centres
- **Environmental Impact Dashboard** — Chart.js bar/doughnut charts on dashboard
- **Multilingual Support** — English + Telugu toggle (stored in localStorage)
- **Marketplace** — buy, sell, donate plastic waste listings with filters
- **Dark/Light Mode Toggle** — stored in localStorage
- **Toast Notifications** — styled in/out animated toasts
- **PWA Manifest** — installable as a web app
- **Global Stats Bar** — live total uploads, CO₂ saved, user count on homepage

## Architecture

### Tech Stack
- **Frontend**: Vanilla HTML/CSS/JavaScript, Chart.js, jsPDF, Leaflet.js
- **Backend**: Node.js + Express.js (serves both API and static frontend)
- **Database**: MongoDB via Mongoose (`mongodb-memory-server` in dev)
- **Auth**: JWT with bcryptjs, role-based (user/admin)
- **AI**: Anthropic Claude Vision API (with smart mock fallback)

### Project Structure
```
├── public/
│   ├── index.html          # Homepage + upload + map + stats
│   ├── dashboard.html      # User/Admin dashboard with charts, leaderboard
│   ├── marketplace.html    # Plastic marketplace
│   ├── login.html          # Login
│   ├── register.html       # Register
│   ├── app.js              # Core analysis + map + stats logic
│   ├── auth.js             # Auth helpers
│   ├── dashboard.js        # Dashboard + leaderboard + charts
│   ├── marketplace.js      # Marketplace logic
│   ├── lang.js             # Multilingual + theme toggle + toast
│   ├── style.css           # All styles (dark/light theme)
│   ├── manifest.json       # PWA manifest
│   └── locales/
│       ├── en.json         # English translations
│       └── te.json         # Telugu translations
└── server/
    ├── server.js           # Express entry point + /api/stats
    ├── config/db.js
    ├── middleware/
    ├── models/
    │   ├── User.js         # + points, badge fields
    │   ├── Upload.js       # + reuseSuggestions field
    │   └── MarketplaceItem.js
    ├── routes/
    │   ├── authRoutes.js
    │   ├── userRoutes.js   # + /profile, /leaderboard; awards points
    │   ├── adminRoutes.js
    │   └── marketplaceRoutes.js
    └── utils/
        └── reuseSuggestions.js  # Rule-based reuse ideas per plastic type
```

## Environment Variables
- `JWT_SECRET` — auto-generated
- `ADMIN_SECRET_KEY` — auto-generated
- `MONGO_URI` — `USE_MEMORY_SERVER` (in-memory MongoDB for dev)
- `PORT` — 5000
- `NODE_ENV` — development

## API Endpoints
- `GET /api/health`
- `GET /api/stats` — global platform statistics
- `POST /api/auth/register` / `POST /api/auth/login` / `GET /api/auth/me`
- `POST /api/user/uploads` — save results, award points, generate reuse suggestions
- `GET /api/user/uploads` — user history
- `GET /api/user/profile` — user points + badge
- `GET /api/user/leaderboard` — top 10 users
- `GET /api/marketplace` — list all marketplace items
- `POST /api/marketplace` — create listing (auth required)
- `DELETE /api/marketplace/:id` — delete own listing (auth required)
- `GET /api/admin/uploads` / `GET /api/admin/users` / CSV/PDF reports
