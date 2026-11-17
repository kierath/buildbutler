import { useState } from 'react';
import { postJSON } from '../api.js';
import Field from './Field.jsx';

const EMPTY_FORM = { name: '', gpu: '', ram_gb: '', network_tag: '' };

export default function AddMachineForm({ onAdded }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState(null);
  // The new machine (with its token) lives only in this state. Once dismissed it's gone
  // for good: the API never sends the token again.
  const [created, setCreated] = useState(null);

  function handleChange(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      setCreated(await postJSON('/api/machines', { ...form, ram_gb: Number(form.ram_gb) }));
      setForm(EMPTY_FORM);
      setError(null);
      onAdded();
    } catch (err) {
      setError(err.message);
    }
  }

  if (created) return <TokenCard machine={created} onDone={() => setCreated(null)} />;

  return (
    <div className="card">
      <h2>Add machine</h2>
      <p className="muted small">Register a test PC so it can receive builds.</p>
      <form className="form" onSubmit={handleSubmit}>
        <Field label="Name" name="name" value={form.name} onChange={handleChange} placeholder="QA-PC-03" />
        <Field label="GPU" name="gpu" value={form.gpu} onChange={handleChange} placeholder="RTX 4070" />
        <Field label="RAM (GB)" name="ram_gb" type="number" min="1" value={form.ram_gb} onChange={handleChange} placeholder="32" />
        <Field label="Network tag" name="network_tag" value={form.network_tag} onChange={handleChange} placeholder="QA Lab" />
        {error && <div className="notice error" role="alert">{error}</div>}
        <button className="btn btn-primary">Add machine</button>
      </form>
    </div>
  );
}

function TokenCard({ machine, onDone }) {
  const [copied, setCopied] = useState(null);

  async function copyToken() {
    try {
      await navigator.clipboard.writeText(machine.agent_token);
      setCopied('Copied!');
    } catch {
      // Clipboard access can be blocked by the browser; the text is still selectable.
      setCopied('Copy blocked: select the token and copy it by hand.');
    }
  }

  return (
    <div className="card">
      <h2>{machine.name} added</h2>
      <div className="notice warning">
        Copy this agent token now. <strong>It won't be shown again.</strong>
      </div>
      <div className="token-box">
        <input readOnly value={machine.agent_token} aria-label="Agent token" onFocus={(e) => e.target.select()} />
        <button className="btn" onClick={copyToken}>Copy</button>
      </div>
      {copied && <p className="muted small" role="status">{copied}</p>}
      <p className="muted small">You'll paste it into install-agent.ps1 when setting up the agent on {machine.name}.</p>
      <button className="btn btn-primary" style={{ width: '100%' }} onClick={onDone}>Done, I've saved it</button>
    </div>
  );
}
