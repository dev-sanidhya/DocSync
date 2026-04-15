import { useParams, Link } from 'react-router-dom';
import { useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import Editor from '../components/Editor.jsx';
import ChatSidebar from '../components/ChatSidebar.jsx';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

const ADJECTIVES = ['Swift','Brave','Clever','Noble','Bright','Calm','Daring','Eager','Witty','Keen','Bold','Crisp'];
const ANIMALS    = ['Panda','Eagle','Tiger','Dolphin','Fox','Wolf','Bear','Hawk','Lynx','Otter','Raven','Crane'];
const COLORS     = ['#EF4444','#F97316','#EAB308','#22C55E','#06B6D4','#6366F1','#8B5CF6','#EC4899','#14B8A6','#F43F5E'];

function getOrCreate(key, make) {
  const val = sessionStorage.getItem(key);
  if (val) return val;
  const next = make();
  sessionStorage.setItem(key, next);
  return next;
}

function initUser() {
  const username = getOrCreate('ds_username',
    () => `${ADJECTIVES[Math.floor(Math.random()*ADJECTIVES.length)]} ${ANIMALS[Math.floor(Math.random()*ANIMALS.length)]}`
  );
  const color = getOrCreate('ds_color',
    () => COLORS[Math.floor(Math.random()*COLORS.length)]
  );
  return { username, color };
}

// ── Icons ────────────────────────────────────────
const IconLink = () => (
  <svg viewBox="0 0 20 20" fill="currentColor">
    <path d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" />
  </svg>
);
const IconCheck = () => (
  <svg viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
  </svg>
);

export default function Document() {
  const { id } = useParams();
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState({ visible: false, msg: '' });
  const [docTitle, setDocTitle] = useState(() =>
    sessionStorage.getItem(`ds_title_${id}`) || 'Untitled Document'
  );
  const [editingTitle, setEditingTitle] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle' | 'saving' | 'saved'
  const [wordCount, setWordCount] = useState({ words: 0, chars: 0 });

  const titleRef = useRef(null);
  const toastTimer = useRef(null);
  const saveTimer = useRef(null);
  const { username, color } = useRef(initUser()).current;

  // ── Socket connection ──────────────────────────
  useEffect(() => {
    const s = io(SERVER_URL, { transports: ['websocket', 'polling'] });
    setSocket(s);
    return () => s.disconnect();
  }, []);

  // ── Announce presence once socket + document join happens ──
  useEffect(() => {
    if (!socket) return;

    socket.on('users-update', setOnlineUsers);

    // Announce after a tiny delay to ensure join-document fires first (inside Editor)
    const t = setTimeout(() => {
      socket.emit('user-presence', { documentId: id, username, color });
    }, 300);

    return () => {
      clearTimeout(t);
      socket.off('users-update', setOnlineUsers);
    };
  }, [socket, id, username, color]);

  // ── Auto-focus title input ─────────────────────
  useEffect(() => {
    if (editingTitle) titleRef.current?.select();
  }, [editingTitle]);

  // ── Helpers ────────────────────────────────────
  const showToast = (msg) => {
    setToast({ visible: true, msg });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(t => ({ ...t, visible: false })), 2000);
  };

  const handleSaveTitle = () => {
    const t = docTitle.trim() || 'Untitled Document';
    setDocTitle(t);
    sessionStorage.setItem(`ds_title_${id}`, t);
    setEditingTitle(false);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      showToast('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleSaveStatus = useCallback((status) => {
    setSaveStatus(status);
    if (status === 'saved') {
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => setSaveStatus('idle'), 2500);
    }
  }, []);

  if (!socket) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Connecting…</p>
      </div>
    );
  }

  return (
    <div className="document-page">
      {/* ── Navbar ── */}
      <nav className="navbar">
        <Link to="/" className="navbar-brand">
          <div className="navbar-brand-icon">📄</div>
          <span className="navbar-brand-text">DocSync</span>
        </Link>

        <div className="nav-div" />

        {/* Title + save status */}
        <div className="navbar-center">
          {editingTitle ? (
            <input
              ref={titleRef}
              className="navbar-title-input"
              value={docTitle}
              onChange={e => setDocTitle(e.target.value)}
              onBlur={handleSaveTitle}
              onKeyDown={e => {
                if (e.key === 'Enter') handleSaveTitle();
                if (e.key === 'Escape') { setEditingTitle(false); setDocTitle(sessionStorage.getItem(`ds_title_${id}`) || 'Untitled Document'); }
              }}
              maxLength={80}
            />
          ) : (
            <div className="navbar-title-display" onClick={() => setEditingTitle(true)} title="Click to rename">
              {docTitle}
            </div>
          )}

          {saveStatus !== 'idle' && (
            <div className={`save-status ${saveStatus}`}>
              <span className="save-dot" />
              {saveStatus === 'saving' ? 'Saving…' : 'Saved'}
            </div>
          )}
        </div>

        {/* Right section */}
        <div className="navbar-right">
          {/* Stacked user avatars */}
          <div className="user-avatars">
            {onlineUsers.map((u, i) => (
              <div
                key={u.username + i}
                className="user-avatar"
                style={{ backgroundColor: u.color, zIndex: onlineUsers.length - i }}
                title={u.username}
              >
                {u.username.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                <span className="user-avatar-tooltip">{u.username}</span>
              </div>
            ))}
          </div>

          <div className="online-badge">
            <span className="status-dot" />
            {onlineUsers.length} online
          </div>

          <button
            className={`btn-share${copied ? ' copied' : ''}`}
            onClick={handleCopyLink}
          >
            {copied ? <IconCheck /> : <IconLink />}
            {copied ? 'Copied!' : 'Share'}
          </button>
        </div>
      </nav>

      {/* ── Main ── */}
      <div className="main-area">
        <section className="editor-section">
          <Editor
            documentId={id}
            socket={socket}
            onSaveStatus={handleSaveStatus}
            onWordCount={setWordCount}
          />
        </section>
        <ChatSidebar
          documentId={id}
          socket={socket}
          username={username}
          userColor={color}
        />
      </div>

      {/* Word count pill */}
      <div className="word-count-bar">
        {wordCount.words} {wordCount.words === 1 ? 'word' : 'words'} · {wordCount.chars} chars
      </div>

      {/* Toast */}
      <div className={`toast${toast.visible ? ' show' : ''}`}>{toast.msg}</div>
    </div>
  );
}
