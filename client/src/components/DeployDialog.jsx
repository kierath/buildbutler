import { useEffect, useState } from 'react';
import { getJSON, postJSON } from '../api.js';
import Modal from './Modal.jsx';

export default function DeployDialog({ build, onClose }) {
  const [machines, setMachines] = useState([]);
  // A Set makes "is this machine ticked?" and toggling simple.
  const [selected, setSelected] = useState(new Set());
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getJSON('/api/machines').then(setMachines).catch((err) => setError(err.message));
  }, []);

  // React only re-renders on a new object, so copy the Set instead of changing it in place.
  function toggle(id) {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  }

  const allSelected = machines.length > 0 && selected.size === machines.length;
  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(machines.map((m) => m.id)));
  }

  async function handleDeploy() {
    try {
      setResult(await postJSON('/api/deploy', { build_id: build.id, machine_ids: [...selected] }));
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }

  const title = `Deploy ${build.project_name} ${build.version}`;
  return (
    <Modal title={title} subtitle={<span className="muted small">Choose which PCs should install this build.</span>} onClose={onClose}>
      {error && <div className="notice error">{error}</div>}
      {result
        ? <DeployResult result={result} onClose={onClose} />
        : (
          <>
            <div className="checklist-toolbar">
              <span className="muted small">{selected.size} of {machines.length} selected</span>
              <button className="link-btn" onClick={toggleAll}>{allSelected ? 'Clear all' : 'Select all'}</button>
            </div>
            {machines.length === 0 && !error && <p className="muted">Loading machines…</p>}
            <ul className="checklist">
              {machines.map((m) => (
                <MachineOption key={m.id} machine={m} build={build}
                               checked={selected.has(m.id)} onToggle={() => toggle(m.id)} />
              ))}
            </ul>
            <div className="modal-actions">
              <button className="btn" onClick={onClose}>Cancel</button>
              <button className="btn btn-primary" disabled={selected.size === 0} onClick={handleDeploy}>
                Deploy to {selected.size} {selected.size === 1 ? 'machine' : 'machines'}
              </button>
            </div>
          </>
        )}
    </Modal>
  );
}

function MachineOption({ machine: m, build, checked, onToggle }) {
  // Flag PCs that already have this exact build, so nobody reinstalls it by accident.
  const alreadyOnIt = m.current_project === build.project_name && m.current_version === build.version;
  return (
    <li>
      <label>
        <input type="checkbox" checked={checked} onChange={onToggle} />
        <span>
          <span className="machine-name">{m.name}</span>
          <span className="muted small"> · {m.gpu} · {m.network_tag}</span>
        </span>
        <span className="muted small">
          {alreadyOnIt ? 'Already on this build' : m.current_version ? `On ${m.current_project} ${m.current_version}` : 'No builds yet'}
        </span>
      </label>
    </li>
  );
}

function DeployResult({ result, onClose }) {
  const queued = result.created.length;
  return (
    <>
      <div className="notice success" role="status">
        Queued on {queued} {queued === 1 ? 'machine' : 'machines'}.
        {result.skipped > 0 && ` ${result.skipped} skipped because this build was already waiting there.`}
        {' '}Each PC installs it the next time its agent runs (Thursdays 09:00, or "run now").
      </div>
      <div className="modal-actions">
        <button className="btn btn-primary" onClick={onClose}>Done</button>
      </div>
    </>
  );
}
