# DocSync - Real-Time Collaborative Document Editor

A browser-based, real-time collaborative document editor where multiple users can edit the same document simultaneously, see each other's presence, and chat - all without creating an account.

Live demo: [https://docsync-cm.vercel.app](https://docsync-cm.vercel.app)

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [How Real-Time Sync Works](#how-real-time-sync-works)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)
- [Known Limitations](#known-limitations)

---

## Features

- **Rich text editing** with support for:
  - Font family (12 options including Inter, Roboto, Merriweather, Playfair Display, Source Code Pro)
  - Font size (small, normal, large, huge)
  - Text color and background highlight
  - Bold, italic, underline, strikethrough
  - Headings (Title, Heading, Subheading, Normal)
  - Ordered and unordered lists
  - Blockquotes and code blocks
  - Text alignment (left, center, right, justify)
  - Hyperlinks

- **Real-time collaboration** - edits from any user are instantly broadcast to all other connected clients via WebSocket using Quill's delta format

- **Live presence indicators** - colored avatar stacks in the navbar show who is currently in the document, with tooltips showing names

- **Editable document title** - click the title in the navbar to rename it; the new title syncs to all collaborators immediately

- **Chat sidebar** - in-room real-time chat with date separators, unread message badge, and color-coded sender names

- **Anonymous identities** - users are automatically assigned a fun random name (e.g. "Swift Panda") and a unique color, persisted in `sessionStorage` for the duration of the browser session

- **Share via URL** - every document lives at a unique UUID-based URL; copy and share it to start collaborating instantly

- **PDF export** - download the document as a PDF using the browser's native print dialog, with proper page margins and typography

- **Visual page breaks** - CSS-rendered page break rulers at every 1056px interval give a realistic page-length feel

- **Save status indicator** - a subtle "Saving..." and "Saved" badge in the navbar confirms when changes are persisted

- **Word and character count** - a fixed pill at the bottom of the screen shows live word and character counts

---

## Tech Stack

### Frontend

| Layer | Technology |
|---|---|
| Framework | React 18 |
| Build Tool | Vite 5 |
| Routing | React Router v6 |
| Rich Text Editor | Quill.js 1.x (Snow theme, vanilla - not react-quill) |
| Real-time Client | Socket.IO Client 4.x |
| Styling | Plain CSS with design tokens (no UI framework) |
| Fonts | Google Fonts |

### Backend

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| HTTP Server | Express 4.x |
| WebSockets | Socket.IO 4.x |
| CORS | cors middleware |
| Storage | In-memory Map (no database) |

---

## Project Structure

```
DocSync/
├── client/                       # React frontend (Vite)
│   ├── public/
│   ├── src/
│   │   ├── App.jsx               # Router setup
│   │   ├── main.jsx              # React entry point (StrictMode intentionally removed)
│   │   ├── index.css             # All styles, design tokens, print media query
│   │   ├── pages/
│   │   │   ├── Home.jsx          # Landing page with "Create Document" button
│   │   │   └── Document.jsx      # Document room: navbar, presence, title, PDF export
│   │   └── components/
│   │       ├── Editor.jsx        # Quill instance, delta sync, save debounce, word count
│   │       └── ChatSidebar.jsx   # Real-time chat with history and unread badge
│   ├── .env.production           # Production VITE_SERVER_URL
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── server/
│   ├── index.js                  # Express + Socket.IO server, in-memory document store
│   └── package.json
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js v18 or later
- npm v9 or later

### 1. Clone the repository

```bash
git clone https://github.com/dev-sanidhya/DocSync.git
cd DocSync
```

### 2. Install dependencies

```bash
# Terminal 1 - Server
cd server
npm install

# Terminal 2 - Client
cd client
npm install
```

### 3. Start the development servers

```bash
# Terminal 1 - Start the backend (runs on port 3001)
cd server
npm run dev

# Terminal 2 - Start the frontend (runs on port 5173)
cd client
npm run dev
```

### 4. Open in browser

Go to [http://localhost:5173](http://localhost:5173), click **Create New Document**, and you will land on a unique document URL like:

```
http://localhost:5173/doc/550e8400-e29b-41d4-a716-446655440000
```

Open that URL in a second browser tab or window to test real-time collaboration.

---

## How Real-Time Sync Works

```
User A types       User B sees
    |                   |
text-change         receive-changes
    |                   |
send-changes  -->  updateContents(delta)
    |
save-document (debounced 800ms)
    |
server stores snapshot
    |
new joiner gets load-document (full snapshot)
```

1. When a client opens a document URL it emits `join-document` with the document ID
2. The server responds with the full document snapshot (`load-document`), the current title (`load-title`), and chat history (`load-chat`)
3. Every local keystroke fires Quill's `text-change` event, which emits `send-changes` with the minimal Quill delta (only the diff, not the full content)
4. The server broadcasts the delta to all other clients in the same Socket.IO room
5. Recipients call `quill.updateContents(delta)` - Quill applies it atomically and preserves all cursor positions
6. An 800ms debounced `save-document` event persists the full snapshot in server memory so users who join later get the correct state

### Delta queuing (mirroring bug fix)

If a `receive-changes` delta arrives before the initial `load-document` snapshot has been applied, the delta's retain-offset arithmetic would be computed against the "Loading..." placeholder text, corrupting the document. To fix this, all incoming deltas are queued in a `pendingDeltas` array and replayed in order only after `setContents` has established the correct baseline.

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | Port the Express server listens on |
| `VITE_SERVER_URL` | `http://localhost:3001` | Socket.IO server URL used by the client |

`PORT` is set automatically by hosting platforms (Render, Railway, Heroku). `VITE_SERVER_URL` must be set at build time for production.

Create `client/.env.production` for production builds:

```
VITE_SERVER_URL=https://your-backend-url.onrender.com
```

---

## Deployment

The app is split into two independently deployable services.

### Backend

The server requires persistent WebSocket connections, so it must run on a platform that supports long-lived processes. Serverless platforms (Vercel Functions, Netlify Functions) will not work.

Recommended options:

| Platform | Free Tier | Notes |
|---|---|---|
| Render | Yes (750 hrs/mo) | Spins down after 15 min inactivity, 30s cold start |
| Railway | Yes ($5 credit/mo) | No sleep on free tier, easiest setup |
| Fly.io | Yes (limited) | Good WebSocket support |
| VPS (DigitalOcean) | From $4/mo | Full control, use pm2 for process management |

Deploy steps (Render example):

1. New Web Service - connect your GitHub repo
2. Root Directory: `server`
3. Build Command: `npm install`
4. Start Command: `node index.js`
5. No environment variables required (Render sets `PORT` automatically)

### Frontend

The client builds to a static bundle and can be hosted on any CDN or static host.

Recommended options:

| Platform | Free Tier | Notes |
|---|---|---|
| Vercel | Yes (unlimited) | Best Vite support, auto-deploys from GitHub |
| Netlify | Yes (100GB/mo) | Same quality as Vercel |
| Cloudflare Pages | Yes (unlimited) | Fastest global CDN |
| GitHub Pages | Yes | Requires `base` path config in vite.config.js |

Deploy via Vercel CLI:

```bash
npm install -g vercel
cd client
vercel --prod
```

Set the `VITE_SERVER_URL` environment variable to your backend URL in both `client/.env.production` and in the Vercel project dashboard (for future redeployments).

### Keeping the backend awake on Render free tier

Render free instances sleep after 15 minutes of inactivity. To prevent cold starts, set up a free pinger at [cron-job.org](https://cron-job.org) to hit your `/health` endpoint every 10 minutes:

```
GET https://your-backend.onrender.com/health
```

---

## Known Limitations

- **No persistence** - document content, titles, and chat history are stored in server memory only. Restarting the server clears everything.
- **No authentication** - anyone with the document URL can view and edit it.
- **No conflict resolution** - concurrent edits rely on Quill's delta ordering. For production use, a proper OT or CRDT implementation (e.g. Yjs) would be more robust.
- **Chat capped at 200 messages** per document to prevent unbounded memory growth.
- **Single server instance** - horizontal scaling is not supported without adding a shared state layer (e.g. Redis adapter for Socket.IO).
