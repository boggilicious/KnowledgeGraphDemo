const PALETTE = [
  '#60a5fa', // blue-400
  '#34d399', // emerald-400
  '#f87171', // red-400
  '#fbbf24', // amber-400
  '#a78bfa', // violet-400
  '#f472b6', // pink-400
  '#38bdf8', // sky-400
  '#4ade80', // green-400
  '#fb923c', // orange-400
  '#e879f9', // fuchsia-400
  '#2dd4bf', // teal-400
  '#818cf8', // indigo-400
]

const cache: Record<string, string> = {}

export function getColor(label: string): string {
  if (cache[label]) return cache[label]
  let hash = 0
  for (let i = 0; i < label.length; i++) {
    hash = label.charCodeAt(i) + ((hash << 5) - hash)
  }
  cache[label] = PALETTE[Math.abs(hash) % PALETTE.length]
  return cache[label]
}
