import type { FGNode } from '../hooks/useGraph'
import { getColor } from '../utils/colors'

interface Props {
  node: FGNode
  onClose: () => void
}

export default function DetailPanel({ node, onClose }: Props) {
  const props = Object.entries(node.properties).filter(([k]) => k !== 'embedding')

  return (
    <aside className="w-72 shrink-0 flex flex-col bg-gray-900 border-l border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: getColor(node.label) }}
          />
          <span className="text-sm font-medium text-gray-200 truncate">{node.name}</span>
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-200 text-xl leading-none ml-2 shrink-0"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Labels */}
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1.5">Labels</p>
          <div className="flex flex-wrap gap-1">
            {node.labels.map(l => (
              <span
                key={l}
                className="text-xs px-2 py-0.5 rounded-full border"
                style={{
                  borderColor: getColor(l) + '80',
                  color: getColor(l),
                  backgroundColor: getColor(l) + '15',
                }}
              >
                {l}
              </span>
            ))}
          </div>
        </div>

        {/* Properties */}
        {props.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1.5">Properties</p>
            <div className="space-y-2.5">
              {props.map(([k, v]) => (
                <div key={k}>
                  <p className="text-xs text-gray-500 mb-0.5">{k}</p>
                  <p className="text-sm text-gray-300 break-words leading-relaxed">
                    {String(v ?? '')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Element ID (collapsed) */}
        <details className="group">
          <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-400 select-none">
            Element ID
          </summary>
          <p className="text-xs text-gray-600 font-mono break-all mt-1">{node.id}</p>
        </details>
      </div>

      {/* v3 Chat placeholder */}
      <div className="border-t border-gray-800 p-3">
        <div className="rounded-lg border border-dashed border-gray-700 py-3 text-center">
          <p className="text-xs text-gray-700">Chat panel (v3)</p>
        </div>
      </div>
    </aside>
  )
}
