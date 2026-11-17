import { useState } from 'react';
import StatusBoard from './pages/StatusBoard.jsx';
import Builds from './pages/Builds.jsx';
import Machines from './pages/Machines.jsx';
import ProjectNotes from './pages/ProjectNotes.jsx';

// With only a few pages, a piece of state is simpler than adding a router library.
const PAGES = [
  { id: 'status', label: 'Status board', Component: StatusBoard },
  { id: 'builds', label: 'Builds', Component: Builds },
  { id: 'machines', label: 'Machines', Component: Machines },
  { id: 'notes', label: 'Project notes', Component: ProjectNotes },
];

export default function App() {
  const [pageId, setPageId] = useState('status');
  const { Component } = PAGES.find((p) => p.id === pageId);

  return (
    <>
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">BB</span>
          Build Butler
        </div>
        <nav className="nav">
          {PAGES.map((p) => (
            <button
              key={p.id}
              className={`nav-link ${p.id === pageId ? 'active' : ''}`}
              aria-current={p.id === pageId ? 'page' : undefined}
              onClick={() => setPageId(p.id)}
            >
              {p.label}
            </button>
          ))}
        </nav>
      </header>
      <main className="page">
        <Component />
      </main>
    </>
  );
}
