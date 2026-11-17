import { useEffect, useState } from 'react';
import { getJSON, postJSON } from '../api.js';

const EMPTY_FORM = { project_id: '', version: '', file_url: '', notes: '' };

export default function RegisterBuildForm({ onRegistered }) {
  const [projects, setProjects] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getJSON('/api/projects').then(setProjects).catch((err) => setMessage({ type: 'error', text: err.message }));
  }, []);

  // One change handler for every field: the input's name says which key to update.
  function handleChange(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function handleSubmit(event) {
    event.preventDefault(); // stop the browser reloading the page
    setSaving(true);
    try {
      // <select> values are always strings, but the API expects a number.
      const build = await postJSON('/api/builds', { ...form, project_id: Number(form.project_id) });
      setMessage({ type: 'success', text: `Registered ${build.version}.` });
      setForm(EMPTY_FORM);
      onRegistered();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card">
      <h2>Register build</h2>
      <p className="muted small">Add the build the client just sent.</p>
      <form className="form" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="project_id">Project</label>
          <select id="project_id" name="project_id" value={form.project_id} onChange={handleChange} required>
            <option value="" disabled>Choose a project…</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.client})</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="version">Version</label>
          <input id="version" name="version" value={form.version} onChange={handleChange} placeholder="0.4.4" required />
        </div>
        <div className="field">
          <label htmlFor="file_url">Zip file URL</label>
          <input id="file_url" name="file_url" value={form.file_url} onChange={handleChange}
                 placeholder="/builds/driftwood-0.4.3.zip" required />
          <span className="hint">Where agents download the build from.</span>
        </div>
        <div className="field">
          <label htmlFor="notes">Notes</label>
          <textarea id="notes" name="notes" value={form.notes} onChange={handleChange} placeholder="What changed?" />
        </div>
        {message && <div className={`notice ${message.type}`} role="status">{message.text}</div>}
        <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Register build'}</button>
      </form>
    </div>
  );
}
