# DocSync — Real-Time Collaborative Document Editor

A browser-based, real-time collaborative text editor built with **React**, **Quill**, **Socket.IO**, and **Express**.  
Multiple users can edit the same document simultaneously and chat with each other — no login required.

---

## Features

- **Rich text editing** — font family, font size, text colour, bold, italic, underline, title/subtitle/normal headings, bullet lists, text alignment
- **Real-time sync** — edits are broadcast instantly to all connected clients via WebSocket (Operational Transform via Quill deltas)
- **Live presence indicator** — shows how many users are in the document
- **Chat sidebar** — in-room text chat with history preserved for the session
- **Anonymous identities** — users get a fun auto-generated name (e.g. "Swift Panda") stored in `sessionStorage`
- **Share via URL** — every document has a unique UUID-based URL; share it to collaborate instantly

---

## Tech Stack

| Layer     | Technology                       |
|-----------|----------------------------------|
| Frontend  | React 18, Vite, React Router v6  |
| Editor    | Quill 1.x (Snow theme)           |
| Realtime  | Socket.IO 4.x (WebSocket)        |
| Backend   | Node.js, Express, Socket.IO      |
| State     | In-memory (Map per document)     |

---

## Prerequisites

- **Node.js** v18 or later
- **npm** v9 or later

---

## Getting Started

### 1 — Clone the repository

```bash
git clone https://github.com/dev-sanidhya/DocSync.git
cd DocSync
```

### 2 — Install dependencies

Open **two terminals**.

**Terminal 1 — Server**
```bash
cd server
npm install
```

**Terminal 2 — Client**
```bash
cd client
npm install
```

### 3 — Run the application

**Terminal 1 — Start the server** (runs on port 3001)
```bash
cd server
npm run dev        # uses nodemon for auto-reload
# or
npm start          # plain node
```

**Terminal 2 — Start the client dev server** (runs on port 5173)
```bash
cd client
npm run dev
```

### 4 — Open in browser

Navigate to **http://localhost:5173**

Click **Create New Document** — you will be redirected to a unique document URL like:
```
http://localhost:5173/doc/550e8400-e29b-41d4-a716-446655440000
```

Copy the URL and open it in a second browser window (or share with a friend on the same network) to test real-time collaboration.

---

## Project Structure

```
DocSync/
├── client/                  # React frontend (Vite)
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── index.css
│   │   ├── pages/
│   │   │   ├── Home.jsx       # Landing page
│   │   │   └── Document.jsx   # Document room page
│   │   └── components/
│   │       ├── Editor.jsx      # Quill rich-text editor + sync logic
│   │       └── ChatSidebar.jsx # Real-time chat panel
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── server/
│   ├── index.js             # Express + Socket.IO server
│   └── package.json
└── README.md
```

---

## How Real-Time Sync Works

1. When a user opens a document URL the client emits `join-document` with the document ID.
2. The server sends back the current document snapshot (`load-document`) and chat history (`load-chat`).
3. Every local edit fires Quill's `text-change` event with a **delta** (the minimal diff).  
   The client emits `send-changes` with that delta.
4. The server broadcasts the delta to all **other** clients in the same Socket.IO room.
5. Recipients call `quill.updateContents(delta)` — Quill applies the delta atomically, preserving cursor positions.
6. A debounced `save-document` event (1 s after the last keystroke) persists the full document snapshot in server memory so late-joining users see the correct state.

---

## Environment Variables

| Variable         | Default                   | Description                  |
|------------------|---------------------------|------------------------------|
| `PORT`           | `3001`                    | Server listen port           |
| `VITE_SERVER_URL`| `http://localhost:3001`   | Socket.IO server URL (client)|

To change the server URL for production, create `client/.env`:
```
VITE_SERVER_URL=https://your-server-domain.com
```

---

## Notes

- Document state is held **in memory** on the server. Restarting the server clears all documents.
- Chat history is capped at 200 messages per document to prevent unbounded memory growth.
