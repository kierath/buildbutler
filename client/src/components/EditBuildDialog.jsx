import { useState } from 'react';
import { putJSON } from '../api.js';
import Modal from './Modal.jsx';
import Field from './Field.jsx';

export default function EditBuildDialog({ build, onSaved, onClose }) {
  // Start from the build's current values so the user only changes what's wrong.
  const [form, setForm] = useState({ version: build.version, file_url: build.file_url, notes: build.notes });
  const [error, setError] = useState(null);

  function handleChange(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      await putJSON(`/api/builds/${build.id}`, form);
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <Modal title={`Edit ${build.project_name} ${build.version}`} onClose={onClose}>
      <form className="form" onSubmit={handleSubmit}>
        {/* "edit-" ids keep these separate from the Register form on the same page */}
        <Field label="Version" name="version" id="edit-version" value={form.version} onChange={handleChange} />
        <Field label="Zip file URL" name="file_url" id="edit-file_url" value={form.file_url} onChange={handleChange} />
        <div className="field">
          <label htmlFor="edit-notes">Notes</label>
          <textarea id="edit-notes" name="notes" value={form.notes} onChange={handleChange} />
        </div>
        {error && <div className="notice error" role="alert">{error}</div>}
        <div className="modal-actions">
          {/* type="button" so Cancel closes the dialog instead of submitting the form */}
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary">Save changes</button>
        </div>
      </form>
    </Modal>
  );
}
