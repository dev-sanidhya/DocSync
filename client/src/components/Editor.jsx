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

export default function Editor({ documentId, socket, onSaveStatus, onWordCount, onInitialTitle }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!socket || !containerRef.current) return;

    // ── Build Quill ──────────────────────────────
    const container = containerRef.current;
    container.innerHTML = '';
    const editorEl = document.createElement('div');
    container.appendChild(editorEl);

    const quill = new Quill(editorEl, {
      theme: 'snow',
      placeholder: 'Start writing…',
      modules: { toolbar: TOOLBAR },
    });

    // Disable browser spell-check / autocorrect so it never squiggles peer text
    const qlEditorEl = container.querySelector('.ql-editor');
    if (qlEditorEl) {
      qlEditorEl.setAttribute('spellcheck', 'false');
      qlEditorEl.setAttribute('autocorrect', 'off');
      qlEditorEl.setAttribute('autocapitalize', 'off');
    }

    quill.disable();
    quill.setText('Loading…');

    // ── State ────────────────────────────────────
    // 'mounted' lets cleanup invalidate closures that fire after teardown.
    // Without this, a stale load-document callback could call setContents on a
    // destroyed Quill instance.
    let mounted = true;
    let isLoaded = false;

    // Deltas that arrive before the load-document snapshot is applied.
    // We queue them and replay in order once setContents has run.
    // This is the core fix for the mirroring bug: previously a delta that
    // arrived before load-document would get applied to "Loading…" text,
    // corrupting the retain-offset arithmetic for every subsequent delta.
    const pendingDeltas = [];

    let saveTimer = null;

    // ── Load document snapshot ───────────────────
    // Named function (not arrow) so socket.off(event, fn) removes exactly
    // this one listener — never use the no-argument form socket.off(event)
    // because it nukes ALL listeners including ones from other effects.
    function handleLoadDocument(content) {
      if (!mounted) return;
      quill.setContents(content);
      quill.enable();
      isLoaded = true;

      // Replay any deltas that arrived before the snapshot
      for (const d of pendingDeltas) {
        quill.updateContents(d);
      }
      pendingDeltas.length = 0;

      reportWordCount();
    }

    // ── Receive peer changes ─────────────────────
    function handleReceiveChanges(delta) {
      if (!mounted) return;

      if (!isLoaded) {
        // Document snapshot hasn't arrived yet — queue for later
        pendingDeltas.push(delta);
        return;
      }

      quill.updateContents(delta);
      reportWordCount();
    }

    // ── Send local changes ───────────────────────
    function handleTextChange(delta, _old, source) {
      if (!mounted || source !== 'user') return;

      onSaveStatus?.('saving');
      socket.emit('send-changes', delta);
      reportWordCount();

      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        if (!mounted) return;
        socket.emit('save-document', quill.getContents());
        onSaveStatus?.('saved');
      }, SAVE_DEBOUNCE);
    }

    function reportWordCount() {
      const text = quill.getText().trim();
      const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
      onWordCount?.({ words, chars: text.length });
    }

    // ── Wire up ──────────────────────────────────
    socket.on('load-document', handleLoadDocument);
    socket.on('receive-changes', handleReceiveChanges);
    quill.on('text-change', handleTextChange);

    socket.emit('join-document', documentId, (initialState) => {
      if (initialState?.title) {
        onInitialTitle?.(initialState.title);
      }
    });

    // ── Cleanup ──────────────────────────────────
    return () => {
      mounted = false;
      clearTimeout(saveTimer);

      // Always use the exact function reference with socket.off so we don't
      // accidentally remove listeners from other effects or instances.
      socket.off('load-document', handleLoadDocument);
      socket.off('receive-changes', handleReceiveChanges);
      quill.off('text-change', handleTextChange);

      container.innerHTML = '';
    };
  }, [socket, documentId, onInitialTitle]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="editor-wrapper">
      <div ref={containerRef} />
    </div>
  );
}
