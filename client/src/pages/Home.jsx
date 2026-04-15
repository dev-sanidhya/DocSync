import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="home-page">
      <div className="home-card">
        <div className="home-logo">📄</div>
        <h1>DocSync</h1>
        <p>Real-time collaborative editing.<br />Share a link — write together, instantly.</p>

        <button className="create-btn" onClick={() => navigate(`/doc/${uuidv4()}`)}>
          <span style={{ fontSize: '1.1em', lineHeight: 1 }}>+</span>
          New Document
        </button>

        <div className="home-features">
          <span className="home-feature">Rich text editing</span>
          <span className="home-feature">Live collaboration</span>
          <span className="home-feature">Built-in chat</span>
          <span className="home-feature">12 font families</span>
        </div>
      </div>
    </div>
  );
}
