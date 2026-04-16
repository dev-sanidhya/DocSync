# DocSync - Prompts Log

A record of the development conversation between the developer and Claude while building DocSync.

---

## Prompt 1

**User:**

I want to build a real-time collaborative document editor called DocSync. I have the architecture figured out - React + Vite on the frontend, Node.js + Express + Socket.IO on the backend. For the sync mechanism I want to use Quill's delta format so we're only broadcasting diffs over the wire rather than full document snapshots on every keystroke. No database, just an in-memory Map on the server keyed by document ID.

For the editor, use vanilla Quill (not react-quill) so we have full control over the instance lifecycle inside a useEffect. The toolbar should cover font family, size, color, bold/italic/underline, headings, lists, blockquote, code block, and alignment.

Each document should have a UUID-based URL. Users get an anonymous identity (random adjective + animal name, random color) stored in sessionStorage. Also add a chat sidebar per document and live presence avatars in the navbar.

**Claude:**

Built the full project from scratch with the described architecture. Created the Express + Socket.IO server with an in-memory store holding content, title, chat, and a users Map per document. React frontend with a vanilla Quill instance managed inside a useEffect ref pattern, real-time delta sync via send-changes/receive-changes, anonymous identities in sessionStorage, a chat sidebar with history, and presence avatars with color indicators. Pushed to GitHub.

---

## Prompt 2

**User:**

The UI needs work, it looks very bare right now. I want a proper design system - CSS variables for colors and spacing, a clean navbar with the doc title in the center, presence avatars stacked on the right, and a share button. Also bump up the font options in the editor, I want at least 10-12 families including some serif and monospace ones. And while you're at it, the editor toolbar needs better visual grouping.

**Claude:**

Rebuilt the styling with a full CSS design token system. Added Inter, Roboto, Open Sans, Lato, Montserrat, Merriweather, Playfair Display, Nunito, Raleway, Source Code Pro, Georgia, and Courier New as registered Quill font families with matching Google Fonts imports. Toolbar sections are now visually grouped with dividers. Navbar has centered editable title, stacked colored avatars with initials and hover tooltips, online count badge, and a share button with copy-to-clipboard.

---

## Prompt 3

**User:**

There's a sync bug I need to look into. When client A types "Atharva", client B sees "AtharvaavrahtA" - the text is being mirrored and reversed. I think what's happening is that receive-changes deltas are firing before load-document has been applied, so the retain offsets in the delta are being computed against the wrong baseline. The delta arithmetic is off because the document state isn't established yet when the first few deltas come in.

**Claude:**

Exactly right on the diagnosis. Fixed it by implementing a pendingDeltas queue - any receive-changes delta that arrives before isLoaded is true gets pushed into the queue instead of applied immediately. Once load-document fires and setContents establishes the correct baseline, the queued deltas are replayed in order. Also found two other contributing issues: React StrictMode was double-invoking the effect causing join-document to emit twice, and socket.off with no function argument was removing all listeners instead of just the one. Fixed all three - removed StrictMode with an explanatory comment, added a server-side duplicate join guard, and switched to named function references for all socket.off calls.

---

## Prompt 4

**User:**

Good! Now a few feature additions:

The document is one continuous scroll right now. I want visual page break rulers so it feels like actual pages. Use CSS if possible, I don't want extra DOM nodes for this. Also the title isn't syncing when someone opens a shared link - the server should store and broadcast the title just like it does with content. Add PDF export too, window.print() with a proper print stylesheet should be enough. And throw in a word count bar at the bottom.

**Claude:**

Page breaks implemented using a repeating CSS linear-gradient on .ql-editor at 1056px intervals - zero extra DOM nodes. Title sync added: server now stores the title per document, sends load-title to new joiners on join-document, and broadcasts title-updated to the room when someone renames it. The title is editable inline by clicking it in the navbar. PDF export via window.print() with a full @media print stylesheet including @page letter size and 0.75in margins. Word/character count pill added at the bottom. Also added a debounced save status indicator and disabled spell-check on the editor element to prevent red squiggles on peer-synced text.

---

## Prompt 5

**User:**

The placeholder text "Start writing..." is rendering way off to the left, outside the content area. Quill's ::before pseudo-element is probably resolving its absolute position against the wrong containing block since .ql-editor doesn't have position: relative set by default.

**Claude:**

Correct - Quill doesn't set position: relative on .ql-editor, so the absolutely positioned ::before was resolving against the nearest positioned ancestor which was the full-width container. Added position: relative to .ql-editor and set left: 96px, top: 80px, and right: 96px on the ::before to match the editor padding exactly.

---

## Prompt 6

**User:**

The title still isn't showing up when someone opens a shared link. I think it might be a React effect ordering issue - child effects run before parent effects after a state update, so Editor's useEffect is probably emitting join-document before Document.jsx has registered the load-title listener on the socket. The server sends load-title right on join, so if the listener isn't wired yet it just gets missed.

**Claude:**

That's exactly what was happening. Fixed by registering both load-title and title-updated listeners directly inside the socket creation effect, before calling setSocket. This way the listeners are already wired on the socket object before it's passed down as a prop, so no matter when the child effect emits join-document the parent is already listening. Removed the separate useEffect that previously handled title listeners.

---


## Prompt 7

**User:**

Shared links are 404ing on the deployed frontend. Since it's a SPA, Vercel is trying to resolve /doc/:id as a file path on the CDN instead of letting React Router handle it client-side. Need a rewrite rule.

**Claude:**

Added vercel.json in the client directory with a catch-all rewrite routing all paths to /index.html. Committed, pushed, and redeployed. Shared links now load correctly.

---

## Prompt 8

**User:**

Write a proper README for the project. Cover the full tech stack, project structure, how the delta sync works, local setup, deployment instructions for both services, and environment variables. No em dashes in the file.

**Claude:**

Wrote a comprehensive README covering all sections: features list, frontend and backend tech stack tables, annotated project structure tree, local setup with step-by-step instructions, an ASCII flow diagram explaining the delta sync pipeline and the pending queue fix, environment variable reference, deployment guides for Render and Vercel with CLI commands, the Render cold start workaround, and a known limitations section. No em dashes used throughout.

---
