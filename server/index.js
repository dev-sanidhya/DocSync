const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors({ origin: '*' }));
app.get('/health', (req, res) => res.json({ status: 'ok' }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// docId -> { content, chat, users: Map<socketId, { username, color }> }
const documents = new Map();

function getOrCreate(docId) {
  if (!documents.has(docId)) {
    documents.set(docId, { content: { ops: [] }, chat: [], users: new Map() });
  }
  return documents.get(docId);
}

function broadcastPresence(docId) {
  const doc = documents.get(docId);
  if (!doc) return;
  const users = Array.from(doc.users.values());
  io.to(docId).emit('users-update', users);
}

io.on('connection', (socket) => {
  let currentDocId = null;

  socket.on('join-document', (documentId) => {
    // Guard: ignore duplicate joins from the same socket (e.g. dev hot-reload)
    if (currentDocId === documentId) return;

    socket.join(documentId);
    currentDocId = documentId;

    const doc = getOrCreate(documentId);
    socket.emit('load-document', doc.content);
    socket.emit('load-chat', doc.chat);

    broadcastPresence(documentId);
  });

  // User announces their identity after joining
  socket.on('user-presence', ({ documentId, username, color }) => {
    const doc = getOrCreate(documentId);
    doc.users.set(socket.id, { username, color });
    broadcastPresence(documentId);
  });

  // ── Document sync ──────────────────────────────────
  socket.on('send-changes', (delta) => {
    if (currentDocId) socket.to(currentDocId).emit('receive-changes', delta);
  });

  socket.on('save-document', (content) => {
    const doc = documents.get(currentDocId);
    if (doc) doc.content = content;
  });

  // ── Chat ──────────────────────────────────────────
  socket.on('send-message', ({ message, sender, color }) => {
    const doc = documents.get(currentDocId);
    if (!doc) return;

    const msg = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      message,
      sender,
      color,
      timestamp: new Date().toISOString(),
    };

    doc.chat.push(msg);
    if (doc.chat.length > 200) doc.chat = doc.chat.slice(-200);
    io.to(currentDocId).emit('receive-message', msg);
  });

  // ── Cleanup ───────────────────────────────────────
  socket.on('disconnect', () => {
    if (!currentDocId) return;
    const doc = documents.get(currentDocId);
    if (doc) {
      doc.users.delete(socket.id);
      broadcastPresence(currentDocId);
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`DocSync server → http://localhost:${PORT}`));
