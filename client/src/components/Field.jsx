// A labelled, required input. Shared by the add and edit forms so they look and behave the same.
// Pass a different `id` when the same field name appears twice on one page
// (e.g. the Register form and the Edit dialog): ids must be unique for labels to work.
export default function Field({ label, name, id = name, ...inputProps }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} name={name} required {...inputProps} />
    </div>
  );
}
