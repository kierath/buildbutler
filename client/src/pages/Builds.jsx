import { useEffect, useState } from 'react';
import { getJSON } from '../api.js';
import TimeAgo from '../components/TimeAgo.jsx';
import RegisterBuildForm from '../components/RegisterBuildForm.jsx';
import DeployDialog from '../components/DeployDialog.jsx';
import EditBuildDialog from '../components/EditBuildDialog.jsx';

export default function Builds() {
  const [builds, setBuilds] = useState([]);
  const [error, setError] = useState(null);
  const [deployBuild, setDeployBuild] = useState(null);
  const [editBuild, setEditBuild] = useState(null);

  // Defined outside useEffect so the form can call it again after registering a build.
  async function loadBuilds() {
    try {
      setBuilds(await getJSON('/api/builds'));
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => { loadBuilds(); }, []);

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Builds</h1>
          <p>Every build a client has sent, newest first. Deploy one to queue it on test PCs.</p>
        </div>
      </div>

      {error && <div className="notice error">Can't load builds ({error}).</div>}

      <div className="with-sidebar">
        <BuildTable builds={builds} onDeploy={setDeployBuild} onEdit={setEditBuild} />
        <RegisterBuildForm onRegistered={loadBuilds} />
      </div>

      {deployBuild && <DeployDialog build={deployBuild} onClose={() => setDeployBuild(null)} />}
      {editBuild && <EditBuildDialog build={editBuild} onSaved={loadBuilds} onClose={() => setEditBuild(null)} />}
    </>
  );
}

function BuildTable({ builds, onDeploy, onEdit }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Project</th>
            <th>Version</th>
            <th>Notes</th>
            <th>Registered</th>
            <th aria-label="Actions"></th>
          </tr>
        </thead>
        <tbody>
          {builds.map((b) => (
            <tr key={b.id}>
              <td className="machine-name">{b.project_name}</td>
              <td className="version">{b.version}</td>
              <td className="notes-cell">{b.notes || '—'}</td>
              <td><TimeAgo date={b.created_at} /></td>
              <td className="row-actions">
                <button className="btn btn-small" onClick={() => onEdit(b)}>Edit</button>
                <button className="btn btn-primary btn-small" onClick={() => onDeploy(b)}>Deploy</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
