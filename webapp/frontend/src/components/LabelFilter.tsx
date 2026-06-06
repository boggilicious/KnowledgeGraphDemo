import { getColor } from '../utils/colors'

interface Props {
  labels: string[]
  activeLabels: Set<string>
  onToggle: (label: string) => void
}

export default function LabelFilter({ labels, activeLabels, onToggle }: Props) {
  if (labels.length === 0) return null

  const allActive = labels.every(l => activeLabels.has(l))

  function toggleAll() {
    if (allActive) {
      labels.forEach(l => activeLabels.has(l) && onToggle(l))
    } else {
      labels.forEach(l => !activeLabels.has(l) && onToggle(l))
    }
  }

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
      <button
        onClick={toggleAll}
        className="text-xs px-2 py-0.5 rounded border border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-500 shrink-0 transition-colors"
      >
        {allActive ? 'None' : 'All'}
      </button>
      <div className="w-px h-4 bg-gray-700 shrink-0" />
      {labels.map(label => {
        const active = activeLabels.has(label)
        const color = getColor(label)
        return (
          <button
            key={label}
            onClick={() => onToggle(label)}
            title={label}
            style={{
              borderColor: active ? color + 'aa' : '#374151',
              backgroundColor: active ? color + '22' : 'transparent',
              color: active ? color : '#6b7280',
            }}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs whitespace-nowrap transition-all hover:opacity-90 shrink-0"
          >
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0 transition-colors"
              style={{ backgroundColor: active ? color : '#4b5563' }}
            />
            {label}
          </button>
        )
      })}
    </div>
  )
}
