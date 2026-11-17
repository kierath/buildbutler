import { useEffect, useState } from 'react';
import { getJSON } from '../api.js';
import StatusBadge from '../components/StatusBadge.jsx';
import TimeAgo from '../components/TimeAgo.jsx';
import Modal from '../components/Modal.jsx';

const REFRESH_MS = 10_000;

export default function StatusBoard() {
  const [machines, setMachines] = useState([]);
  const [error, setError] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);
  // Store the id rather than the machine object, so the open log updates on each refresh too.
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        setMachines(await getJSON('/api/machines'));
        setUpdatedAt(new Date());
        setError(null);
      } catch (err) {
        // Keep showing the last good data; a brief server blip shouldn't blank the board.
        setError(err.message);
      }
    }
    load();
    const timer = setInterval(load, REFRESH_MS);
    // Stop polling when the user leaves this page, otherwise timers pile up.
    return () => clearInterval(timer);
  }, []);

  const selected = machines.find((m) => m.id === selectedId);

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Status board</h1>
          <p>Which build every test PC is on, and how the latest install went.</p>
        </div>
        <span className="muted small">
          {updatedAt ? `Updated ${updatedAt.toLocaleTimeString()} · refreshes every 10s` : 'Loading…'}
        </span>
      </div>

      {error && <div className="notice error">Can't reach the server ({error}). Retrying every 10 seconds.</div>}

      <Summary machines={machines} />

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Machine</th>
              <th>GPU</th>
              <th>Network</th>
              <th>Current build</th>
              <th>Latest install</th>
              <th>Last seen</th>
            </tr>
          </thead>
          <tbody>
            {machines.map((m) => (
              <MachineRow key={m.id} machine={m} onOpen={() => setSelectedId(m.id)} />
            ))}
          </tbody>
        </table>
      </div>

      {selected && <InstallLog machine={selected} onClose={() => setSelectedId(null)} />}
    </>
  );
}

function Summary({ machines }) {
  const count = (statuses) => machines.filter((m) => statuses.includes(m.latest_status)).length;
  return (
    <div className="summary">
      <Tile label="Machines" value={machines.length} />
      <Tile label="Up to date" value={count(['success'])} colour="green" />
      <Tile label="Pending or installing" value={count(['pending', 'installing'])} colour="amber" />
      <Tile label="Failed" value={count(['failed'])} colour="red" />
    </div>
  );
}

function Tile({ label, value, colour = '' }) {
  return (
    <div className={`tile ${colour}`}>
      <div className="tile-value">{value}</div>
      <div className="tile-label">{label}</div>
    </div>
  );
}

function MachineRow({ machine: m, onOpen }) {
  const hasInstall = Boolean(m.latest_install_id);
  // Rows act like buttons, so they also need to work from the keyboard.
  const clickProps = hasInstall
    ? { className: 'clickable', tabIndex: 0, onClick: onOpen, onKeyDown: (e) => e.key === 'Enter' && onOpen() }
    : {};

  return (
    <tr {...clickProps}>
      <td>
        <div className="machine-name">{m.name}</div>
        <div className="muted small">{m.ram_gb} GB RAM</div>
      </td>
      <td>{m.gpu}</td>
      <td><span className="tag">{m.network_tag}</span></td>
      <td>
        {m.current_version
          ? <>{m.current_project} <span className="muted">{m.current_version}</span></>
          : <span className="muted">—</span>}
      </td>
      <td>
        <StatusBadge status={m.latest_status} />
        {/* Only name the build when it differs from what's installed, e.g. an update in progress. */}
        {hasInstall && m.latest_status !== 'success' && (
          <div className="muted small">{m.latest_project} {m.latest_version}</div>
        )}
      </td>
      <td><TimeAgo date={m.last_seen} /></td>
    </tr>
  );
}

function InstallLog({ machine: m, onClose }) {
  const subtitle = (
    <span className="muted small">
      <StatusBadge status={m.latest_status} /> &nbsp;Updated <TimeAgo date={m.latest_updated_at} />
    </span>
  );
  return (
    <Modal title={`${m.name} · ${m.latest_project} ${m.latest_version}`} subtitle={subtitle} onClose={onClose}>
      {m.latest_log
        ? <pre className="log">{m.latest_log}</pre>
        : <p className="muted">No log yet. The agent writes one when it picks up this install.</p>}
    </Modal>
  );
}
