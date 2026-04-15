import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';

export default function Home() {
  const navigate = useNavigate();

  const createDocument = () => {
    const id = uuidv4();
    navigate(`/doc/${id}`);
  };

  return (
    <div className="home-page">
      <div className="home-card">
        <span className="home-icon">📄</span>
        <h1>DocSync</h1>
        <p>Real-time collaborative document editing — share a link and write together.</p>

        <button className="create-btn" onClick={createDocument}>
          <span>+</span>
          <span>Create New Document</span>
        </button>

        <div className="home-features">
          <span className="home-feature">
            <span className="home-feature-dot" />
            Rich Text Editing
          </span>
          <span className="home-feature">
            <span className="home-feature-dot" />
            Live Collaboration
          </span>
          <span className="home-feature">
            <span className="home-feature-dot" />
            Built-in Chat
          </span>
        </div>
      </div>
    </div>
  );
}
