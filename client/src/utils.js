// Small shared helpers

// 72.5 -> "1:12.5"
export function fmtTime(sec) {
  const s = Math.max(0, Number(sec) || 0)
  const m = Math.floor(s / 60)
  const rest = (s - m * 60).toFixed(1).padStart(4, '0')
  return `${m}:${rest}`
}

export function fmtRange(start, end) {
  return `${fmtTime(start)} – ${fmtTime(end)}`
}

export function fmtLength(start, end) {
  return `${Math.max(0, end - start).toFixed(1)}s`
}