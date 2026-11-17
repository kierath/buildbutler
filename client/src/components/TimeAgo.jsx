// "3 min ago" is quicker to read on a status board than a full timestamp,
// so the exact time goes in a tooltip instead.

const UNITS = [
  { name: 'day', seconds: 86400 },
  { name: 'hour', seconds: 3600 },
  { name: 'min', seconds: 60 },
];

export function timeAgo(date) {
  const seconds = (Date.now() - new Date(date).getTime()) / 1000;
  if (seconds < 60) return 'just now';
  const unit = UNITS.find((u) => seconds >= u.seconds);
  const count = Math.floor(seconds / unit.seconds);
  const plural = count === 1 || unit.name === 'min' ? '' : 's';
  return `${count} ${unit.name}${plural} ago`;
}

export default function TimeAgo({ date }) {
  if (!date) return <span className="muted">Never</span>;
  return (
    <time dateTime={date} title={new Date(date).toLocaleString()}>
      {timeAgo(date)}
    </time>
  );
}
