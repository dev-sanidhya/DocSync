import { useEffect, useRef } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';

// ── Register custom font families ───────────────
const Font = Quill.import('formats/font');
Font.whitelist = ['arial', 'georgia', 'impact', 'tahoma', 'times-new-roman', 'verdana', 'courier-new'];
Quill.register(Font, true);

// ── Toolbar configuration ────────────────────────
const TOOLBAR = [
  // Structure: Title (h1), Subtitle (h2), Normal (false)
  [{ header: [1, 2, false] }],
  // Typography
  [{ font: Font.whitelist }],
  [{ size: ['small', false, 'large', 'huge'] }],
  [{ color: [] }],
  // Text styling
  ['bold', 'italic', 'underline'],
  // Lists
  [{ list: 'bullet' }],
  // Alignment
  [{ align: [] }],
  // Misc
  ['clean'],
];

const SAVE_DEBOUNCE_MS = 1000;

export default function Editor({ documentId, socket }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!socket || !containerRef.current) return;

    // --- Build Quill instance ---
    const container = containerRef.current;
    container.innerHTML = '';                        // clear on re-mount (strict mode)
    const editorEl = document.createElement('div');
    container.appendChild(editorEl);

    const quill = new Quill(editorEl, {
      theme: 'snow',
      placeholder: 'Start typing your document…',
      modules: { toolbar: TOOLBAR },
    });

    quill.disable();
    quill.setText('Loading…');

    // --- Load existing document content ---
    socket.once('load-document', (content) => {
      quill.setContents(content);
      quill.enable();
      // Move cursor to end
      quill.setSelection(quill.getLength(), 0);
    });

    socket.emit('join-document', documentId);

    // --- Send incremental deltas to peers ---
    let saveTimer = null;

    const onTextChange = (delta, _old, source) => {
      if (source !== 'user') return;

      // Relay the delta to all other clients in the room
      socket.emit('send-changes', delta);

      // Debounced full-snapshot save so new joiners get current state
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        socket.emit('save-document', quill.getContents());
      }, SAVE_DEBOUNCE_MS);
    };

    quill.on('text-change', onTextChange);

    // --- Receive changes from peers ---
    const onReceiveChanges = (delta) => {
      quill.updateContents(delta);
    };

    socket.on('receive-changes', onReceiveChanges);

    // --- Cleanup ---
    return () => {
      clearTimeout(saveTimer);
      quill.off('text-change', onTextChange);
      socket.off('receive-changes', onReceiveChanges);
      socket.off('load-document');
      container.innerHTML = '';
    };
  }, [socket, documentId]);

  return (
    <div className="editor-wrapper">
      <div ref={containerRef} />
    </div>
  );
}
