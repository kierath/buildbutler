import { useEffect, useState } from 'react';
import { getJSON } from '../api.js';
import TimeAgo from '../components/TimeAgo.jsx';

export default function ProjectNotes() {
  const [projects, setProjects] = useState([]);
  const [builds, setBuilds] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Both requests run at the same time rather than one after the other.
    Promise.all([getJSON('/api/projects'), getJSON('/api/builds')])
      .then(([p, b]) => { setProjects(p); setBuilds(b); })
      .catch((err) => setError(err.message));
  }, []);

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Project notes</h1>
          <p>Each client project, its builds, and what testers need to know before playing.</p>
        </div>
      </div>

      {error && <div className="notice error">Can't load projects ({error}).</div>}

      <div className="project-list">
        {projects.map((p) => (
          // builds are already newest first from the API, so filtering keeps that order.
          <ProjectCard key={p.id} project={p} builds={builds.filter((b) => b.project_id === p.id)} />
        ))}
      </div>
    </>
  );
}

function ProjectCard({ project, builds }) {
  return (
    <section className="card project-card">
      <div className="project-header">
        <div>
          <h2>{project.name}</h2>
          <span className="muted small">{project.client}</span>
        </div>
        <span className="tag">{project.engine}</span>
      </div>

      <h3 className="section-label">Builds</h3>
      {builds.length === 0
        ? <p className="muted small">No builds yet.</p>
        : (
          <ul className="build-list">
            {builds.map((b) => (
              <li key={b.id}>
                <span className="version">{b.version}</span>
                <span className="muted">{b.notes || '—'}</span>
                <span className="muted small"><TimeAgo date={b.created_at} /></span>
              </li>
            ))}
          </ul>
        )}

      <h3 className="section-label">Setup notes</h3>
      <p className="setup-notes">{project.setup_notes || <span className="muted">No setup notes.</span>}</p>
    </section>
  );
}
