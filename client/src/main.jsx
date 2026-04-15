import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// StrictMode intentionally removed: it double-fires useEffect in dev which
// causes Quill + Socket.IO's imperative setup to emit join-document twice,
// race-loading the document snapshot against live deltas and mirroring text.
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
