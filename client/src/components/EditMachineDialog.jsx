import { useState } from 'react';
import { putJSON } from '../api.js';
import Modal from './Modal.jsx';
import Field from './Field.jsx';

export default function EditMachineDialog({ machine, onSaved, onClose }) {
  const [form, setForm] = useState({
    name: machine.name, gpu: machine.gpu, ram_gb: machine.ram_gb, network_tag: machine.network_tag,
  });
  const [error, setError] = useState(null);

  function handleChange(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      // Number inputs still give strings, but the API expects ram_gb as a number.
      await putJSON(`/api/machines/${machine.id}`, { ...form, ram_gb: Number(form.ram_gb) });
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <Modal title={`Edit ${machine.name}`}
           subtitle={<span className="muted small">The agent token stays the same, so the PC keeps working.</span>}
           onClose={onClose}>
      <form className="form" onSubmit={handleSubmit}>
        {/* "edit-" ids keep these separate from the Add machine form on the same page */}
        <Field label="Name" name="name" id="edit-name" value={form.name} onChange={handleChange} />
        <Field label="GPU" name="gpu" id="edit-gpu" value={form.gpu} onChange={handleChange} />
        <Field label="RAM (GB)" name="ram_gb" id="edit-ram_gb" type="number" min="1" value={form.ram_gb} onChange={handleChange} />
        <Field label="Network tag" name="network_tag" id="edit-network_tag" value={form.network_tag} onChange={handleChange} />
        {error && <div className="notice error" role="alert">{error}</div>}
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary">Save changes</button>
        </div>
      </form>
    </Modal>
  );
}
