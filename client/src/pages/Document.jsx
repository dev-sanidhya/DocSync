import { useParams, Link } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import Editor from '../components/Editor.jsx';
import ChatSidebar from '../components/ChatSidebar.jsx';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

/** Generate a fun anonymous display name and persist it for the session. */
function getUsername() {
  const key = 'docsync_username';
  const existing = sessionStorage.getItem(key);
  if (existing) return existing;

  const adjectives = ['Swift', 'Brave', 'Clever', 'Noble', 'Bright', 'Calm', 'Daring', 'Eager', 'Witty', 'Keen'];
  const animals    = ['Panda', 'Eagle', 'Tiger', 'Dolphin', 'Fox', 'Wolf', 'Bear', 'Hawk', 'Lynx', 'Otter'];
  const name = `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${animals[Math.floor(Math.random() * animals.length)]}`;
  sessionStorage.setItem(key, name);
  return name;
}

export default function Document() {
  const { id } = useParams();
  const [socket, setSocket] = useState(null);
  const [userCount, setUserCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const toastTimer = useRef(null);
  const username = useRef(getUsername()).current;

  // Connect socket once on mount
  useEffect(() => {
    const s = io(SERVER_URL, { transports: ['websocket', 'polling'] });
    setSocket(s);
    return () => s.disconnect();
  }, []);

  // Track live user count
  useEffect(() => {
    if (!socket) return;
    socket.on('user-count', setUserCount);
    return () => socket.off('user-count', setUserCount);
  }, [socket]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setToastVisible(true);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastVisible(false), 2200);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      showToast('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!socket) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Connecting to server…</p>
      </div>
    );
  }

  return (
    <div className="document-page">
      {/* ── Navbar ── */}
      <nav className="navbar">
        <Link to="/" className="navbar-brand">
          <span className="navbar-brand-icon">📄</span>
          DocSync
        </Link>

        <div className="navbar-doc-info">
          <span className="navbar-doc-id">
            doc / {id.slice(0, 8)}…
          </span>
          <span className="navbar-user-count">
            <span className="user-dot" />
            {userCount} online
          </span>
        </div>

        <div className="navbar-actions">
          <button
            className={`btn-copy-link${copied ? ' copied' : ''}`}
            onClick={handleCopyLink}
          >
            {copied ? '✓ Copied!' : '🔗 Copy Link'}
          </button>
        </div>
      </nav>

      {/* ── Main Area ── */}
      <div className="main-area">
        <section className="editor-section">
          <Editor documentId={id} socket={socket} />
        </section>
        <ChatSidebar documentId={id} socket={socket} username={username} />
      </div>

      {/* ── Toast ── */}
      <div className={`toast${toastVisible ? ' show' : ''}`}>{toastMsg}</div>
    </div>
  );
}
