// Maps each install status to a colour, so every page shows statuses the same way.
const STYLES = {
  success:    { colour: 'green', label: 'Success' },
  pending:    { colour: 'amber', label: 'Pending' },
  installing: { colour: 'amber', label: 'Installing', pulse: true },
  failed:     { colour: 'red',   label: 'Failed' },
};

export default function StatusBadge({ status }) {
  // A machine that has never had a build deployed has no status at all.
  const style = STYLES[status] ?? { colour: 'grey', label: 'No builds' };
  return (
    <span className={`badge ${style.colour} ${style.pulse ? 'pulse' : ''}`}>
      {style.label}
    </span>
  );
}
