import { useState, useEffect, useRef } from 'react';

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ChatSidebar({ documentId, socket, username }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Load chat history & subscribe to incoming messages
  useEffect(() => {
    if (!socket) return;

    const onLoadChat = (history) => setMessages(history);

    const onReceiveMessage = (msg) => {
      setMessages((prev) => [...prev, msg]);
    };

    socket.on('load-chat', onLoadChat);
    socket.on('receive-message', onReceiveMessage);

    return () => {
      socket.off('load-chat', onLoadChat);
      socket.off('receive-message', onReceiveMessage);
    };
  }, [socket]);

  // Auto-scroll to newest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || !socket) return;

    socket.emit('send-message', { message: text, sender: username });
    setInput('');
    inputRef.current?.focus();
  };

  return (
    <aside className="chat-sidebar">
      {/* Header */}
      <div className="chat-header">
        <h3>💬 Chat</h3>
        <span className="chat-user-name">{username}</span>
      </div>

      {/* Message list */}
      <div className="chat-messages">
        {messages.length === 0 ? (
          <p className="chat-empty">
            No messages yet.<br />Start the conversation!
          </p>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.sender === username;
            return (
              <div key={msg.id} className={`chat-message ${isOwn ? 'own' : 'other'}`}>
                <div className="msg-meta">
                  <span className="msg-sender">{isOwn ? 'You' : msg.sender}</span>
                  <span className="msg-time">{formatTime(msg.timestamp)}</span>
                </div>
                <div className="msg-body">{msg.message}</div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form className="chat-input-form" onSubmit={sendMessage}>
        <input
          ref={inputRef}
          className="chat-input"
          type="text"
          placeholder="Type a message…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={500}
        />
        <button className="chat-send-btn" type="submit" disabled={!input.trim()}>
          Send
        </button>
      </form>
    </aside>
  );
}
