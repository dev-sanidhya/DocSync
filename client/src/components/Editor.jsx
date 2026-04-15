import { useEffect, useRef } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';

// ── Register Google Font families ───────────────
const Font = Quill.import('formats/font');
Font.whitelist = [
  'inter', 'roboto', 'open-sans', 'lato', 'montserrat',
  'merriweather', 'playfair', 'nunito', 'raleway',
  'source-code', 'georgia', 'courier-new',
];
Quill.register(Font, true);

// ── Toolbar ──────────────────────────────────────
const TOOLBAR = [
  [{ header: [1, 2, 3, false] }],
  [{ font: Font.whitelist }],
  [{ size: ['small', false, 'large', 'huge'] }],
  ['bold', 'italic', 'underline', 'strike'],
  [{ color: [] }, { background: [] }],
  [{ list: 'ordered' }, { list: 'bullet' }],
  ['blockquote', 'code-block'],
  [{ align: [] }],
  ['link', 'clean'],
];

const SAVE_DEBOUNCE = 800;

export default function Editor({ documentId, socket, onSaveStatus, onWordCount }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!socket || !containerRef.current) return;

    const container = containerRef.current;
    container.innerHTML = '';
    const editorEl = document.createElement('div');
    container.appendChild(editorEl);

    const quill = new Quill(editorEl, {
      theme: 'snow',
      placeholder: 'Start writing…',
      modules: { toolbar: TOOLBAR },
    });

    // Kill browser spell-check (causes the red squiggle artifacts)
    const qlEditorEl = container.querySelector('.ql-editor');
    if (qlEditorEl) {
      qlEditorEl.setAttribute('spellcheck', 'false');
      qlEditorEl.setAttribute('autocorrect', 'off');
      qlEditorEl.setAttribute('autocapitalize', 'off');
    }

    quill.disable();
    quill.setText('Loading…');

    // ── Load document ────────────────────────────
    socket.once('load-document', (content) => {
      quill.setContents(content);
      quill.enable();
      quill.setSelection(quill.getLength(), 0);
      reportWordCount(quill);
    });

    socket.emit('join-document', documentId);

    // ── Send & persist changes ───────────────────
    let saveTimer = null;

    const onTextChange = (delta, _old, source) => {
      if (source !== 'user') return;

      onSaveStatus?.('saving');
      socket.emit('send-changes', delta);

      reportWordCount(quill);

      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        socket.emit('save-document', quill.getContents());
        onSaveStatus?.('saved');
      }, SAVE_DEBOUNCE);
    };

    quill.on('text-change', onTextChange);

    // ── Receive changes from peers ───────────────
    const onReceiveChanges = (delta) => {
      quill.updateContents(delta);
      reportWordCount(quill);
    };
    socket.on('receive-changes', onReceiveChanges);

    function reportWordCount(q) {
      const text = q.getText().trim();
      const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
      const chars = text.length;
      onWordCount?.({ words, chars });
    }

    // ── Cleanup ──────────────────────────────────
    return () => {
      clearTimeout(saveTimer);
      quill.off('text-change', onTextChange);
      socket.off('receive-changes', onReceiveChanges);
      socket.off('load-document');
      container.innerHTML = '';
    };
  }, [socket, documentId]); // eslint-disable-line

  return (
    <div className="editor-wrapper">
      <div ref={containerRef} />
    </div>
  );
}
