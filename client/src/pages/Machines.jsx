import { useEffect, useState } from 'react';
import { getJSON } from '../api.js';
import TimeAgo from '../components/TimeAgo.jsx';
import AddMachineForm from '../components/AddMachineForm.jsx';
import EditMachineDialog from '../components/EditMachineDialog.jsx';

export default function Machines() {
  const [machines, setMachines] = useState([]);
  const [error, setError] = useState(null);
  const [editMachine, setEditMachine] = useState(null);

  async function loadMachines() {
    try {
      setMachines(await getJSON('/api/machines'));
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => { loadMachines(); }, []);

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Machines</h1>
          <p>Test PCs running the Build Butler agent. Add one, then install the agent on it with its token.</p>
        </div>
      </div>

      {error && <div className="notice error">Can't load machines ({error}).</div>}

      <div className="with-sidebar">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Machine</th>
                <th>GPU</th>
                <th>RAM</th>
                <th>Network</th>
                <th>Agent last seen</th>
                <th aria-label="Actions"></th>
              </tr>
            </thead>
            <tbody>
              {machines.map((m) => (
                <tr key={m.id}>
                  <td className="machine-name">{m.name}</td>
                  <td>{m.gpu}</td>
                  <td>{m.ram_gb} GB</td>
                  <td><span className="tag">{m.network_tag}</span></td>
                  <td><TimeAgo date={m.last_seen} /></td>
                  <td className="row-actions">
                    <button className="btn btn-small" onClick={() => setEditMachine(m)}>Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <AddMachineForm onAdded={loadMachines} />
      </div>

      {editMachine && (
        <EditMachineDialog machine={editMachine} onSaved={loadMachines} onClose={() => setEditMachine(null)} />
      )}
    </>
  );
}
