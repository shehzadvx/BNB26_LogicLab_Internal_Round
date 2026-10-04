const LABELS = { idea: 'Idea', scripted: 'Scripted', edited: 'Edited', ready: 'Ready', scheduled: 'Scheduled' }

export default function StatusBadge({ status }) {
  const s = status || 'idea'
  return <span className={`status-badge status-${s}`}>{LABELS[s] || s}</span>
}
