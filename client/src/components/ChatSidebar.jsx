import { useState, useEffect, useRef } from 'react';

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Send icon SVG
const IconSend = () => (
  <svg viewBox="0 0 20 20" fill="currentColor">
    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
  </svg>
);
const IconChat = () => (
  <svg viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
  </svg>
);

export default function ChatSidebar({ socket, username, userColor }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const messagesRef = useRef(null);

  useEffect(() => {
    if (!socket) return;

    const onLoadChat = (history) => setMessages(history);
    const onReceiveMessage = (msg) => {
      setMessages(prev => [...prev, msg]);
      // If scrolled up, show unread badge
      const el = messagesRef.current;
      if (el && el.scrollHeight - el.scrollTop - el.clientHeight > 60) {
        setUnread(n => n + 1);
      }
    };

    socket.on('load-chat', onLoadChat);
    socket.on('receive-message', onReceiveMessage);
    return () => {
      socket.off('load-chat', onLoadChat);
      socket.off('receive-message', onReceiveMessage);
    };
  }, [socket]);

  // Auto-scroll on new messages
  useEffect(() => {
    const el = messagesRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (isNearBottom) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      setUnread(0);
    }
  }, [messages]);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    setUnread(0);
  };

  const sendMessage = (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || !socket) return;
    socket.emit('send-message', { message: text, sender: username, color: userColor });
    setInput('');
    inputRef.current?.focus();
    setTimeout(scrollToBottom, 100);
  };

  return (
    <aside className="chat-sidebar">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-header-title">
          <IconChat />
          Chat
        </div>
        <span className="chat-you-badge">{username}</span>
      </div>

      {/* Messages */}
      <div className="chat-messages" ref={messagesRef} onScroll={() => {
        const el = messagesRef.current;
        if (!el) return;
        if (el.scrollHeight - el.scrollTop - el.clientHeight < 40) setUnread(0);
      }}>
        {messages.length === 0 ? (
          <div className="chat-empty">
            <div className="chat-empty-icon">💬</div>
            <p>No messages yet.<br />Be the first to say something!</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isOwn = msg.sender === username;
            // Show date separator on first message or when day changes
            const showDate = idx === 0 || (
              new Date(msg.timestamp).toDateString() !==
              new Date(messages[idx - 1].timestamp).toDateString()
            );
            return (
              <div key={msg.id}>
                {showDate && (
                  <div className="chat-date-sep">
                    {new Date(msg.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </div>
                )}
                <div className={`msg-row ${isOwn ? 'own' : 'other'}`}>
                  <div className="msg-meta">
                    <span
                      className="msg-sender"
                      style={{ color: isOwn ? '#6366F1' : (msg.color || '#64748B') }}
                    >
                      {isOwn ? 'You' : msg.sender}
                    </span>
                    <span className="msg-time">{formatTime(msg.timestamp)}</span>
                  </div>
                  <div className="msg-bubble">{msg.message}</div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Unread badge */}
      {unread > 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '4px 0',
            cursor: 'pointer',
            fontSize: '.75rem',
            color: '#6366F1',
            fontWeight: 600,
            background: '#EEF2FF',
          }}
          onClick={scrollToBottom}
        >
          ↓ {unread} new {unread === 1 ? 'message' : 'messages'}
        </div>
      )}

      {/* Input */}
      <div className="chat-input-area">
        <form className="chat-input-form" onSubmit={sendMessage}>
          <input
            ref={inputRef}
            className="chat-input"
            type="text"
            placeholder="Message…"
            value={input}
            onChange={e => setInput(e.target.value)}
            maxLength={500}
          />
          <button className="chat-send-btn" type="submit" disabled={!input.trim()}>
            <IconSend />
          </button>
        </form>
      </div>
    </aside>
  );
}
