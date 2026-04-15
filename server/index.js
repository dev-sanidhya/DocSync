const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors({ origin: '*' }));

// Basic health-check endpoint
app.get('/health', (req, res) => res.json({ status: 'ok' }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// In-memory store: docId -> { content: Delta, chat: Message[] }
const documents = new Map();

io.on('connection', (socket) => {
  // Each socket joins a document room
  socket.on('join-document', (documentId) => {
    socket.join(documentId);

    // Initialise document slot if first visitor
    if (!documents.has(documentId)) {
      documents.set(documentId, { content: { ops: [] }, chat: [] });
    }

    const doc = documents.get(documentId);

    // Send existing document state and chat history to the joining client
    socket.emit('load-document', doc.content);
    socket.emit('load-chat', doc.chat);

    // Broadcast updated user count to everyone in the room
    const broadcastUserCount = () => {
      const room = io.sockets.adapter.rooms.get(documentId);
      const count = room ? room.size : 0;
      io.to(documentId).emit('user-count', count);
    };
    broadcastUserCount();

    // ---------- Document sync ----------

    // Receive an incremental Quill delta from one client, relay to others
    socket.on('send-changes', (delta) => {
      socket.to(documentId).emit('receive-changes', delta);
    });

    // Receive the full document snapshot (debounced on client) and persist it
    socket.on('save-document', (content) => {
      const d = documents.get(documentId);
      if (d) d.content = content;
    });

    // ---------- Chat ----------

    socket.on('send-message', ({ message, sender }) => {
      const d = documents.get(documentId);
      if (!d) return;

      const msg = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        message,
        sender,
        timestamp: new Date().toISOString(),
      };

      d.chat.push(msg);
      // Cap history at 200 messages per room
      if (d.chat.length > 200) d.chat = d.chat.slice(-200);

      io.to(documentId).emit('receive-message', msg);
    });

    // ---------- Cleanup ----------

    socket.on('disconnect', () => {
      broadcastUserCount();
    });
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`DocSync server listening on http://localhost:${PORT}`);
});
