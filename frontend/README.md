# Automatic Sales - Frontend

Modern React + Tailwind CSS dashboard for AI-powered sales automation.

## Tech Stack

- **React 18** - UI framework
- **Tailwind CSS 4** - Styling
- **React Router v6** - Routing
- **TanStack Query** - Server state management
- **Recharts** - Charts and analytics
- **Lucide React** - Icons
- **Axios** - HTTP client
- **Vite** - Build tool

## Quick Start

### Prerequisites

- Node.js 18+
- Backend running on `http://localhost:8000`

### Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

Frontend runs at `http://localhost:5173`

### Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
src/
├── components/     # Reusable UI components
│   ├── Badge.jsx
│   ├── Button.jsx
│   ├── DataTable.jsx
│   ├── Layout.jsx
│   ├── Modal.jsx
│   ├── StatsCard.jsx
│   └── Toast.jsx
├── pages/          # Route pages
│   ├── Analytics.jsx
│   ├── Campaigns.jsx
│   ├── Companies.jsx
│   ├── Dashboard.jsx
│   ├── Leads.jsx
│   ├── Messages.jsx
│   └── Settings.jsx
├── services/       # API layer
│   └── api.js
├── App.jsx         # Main app with routing
└── index.css       # Tailwind styles
```

## Features

- **Dashboard** - Overview stats and charts
- **Companies** - AI-powered company discovery
- **Campaigns** - Create and manage outreach campaigns
- **Messages** - View and send messages
- **Leads** - Qualified leads from replies
- **Analytics** - Detailed performance metrics
- **Settings** - App configuration

## Design

- Light theme with gradient accents
- Responsive sidebar navigation
- Modern card-based layouts
- Consistent spacing and typography

## API Proxy

Dev server proxies `/api` requests to backend:

```javascript
// vite.config.js
proxy: {
  '/api': {
    target: 'http://localhost:8000',
    changeOrigin: true,
  },
}
```

## Documentation

See `/docs` folder for:
- BRD.md - Business Requirements
- PRD.md - Product Requirements
- FRONTEND-ARCHITECTURE.md - Technical docs
- API-REFERENCE.md - API documentation
