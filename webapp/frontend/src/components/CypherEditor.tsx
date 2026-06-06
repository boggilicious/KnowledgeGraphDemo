import { useState } from 'react'

interface Props {
  onRun: (query: string) => void
  loading: boolean
}

const DEFAULT_QUERY = 'MATCH (n)-[r]->(m) RETURN n, r, m LIMIT 50'

export default function CypherEditor({ onRun, loading }: Props) {
  const [query, setQuery] = useState(DEFAULT_QUERY)
  const [error, setError] = useState<string | null>(null)

  function handleRun() {
    if (!query.trim() || loading) return
    setError(null)
    onRun(query.trim())
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      handleRun()
    }
  }

  return (
    <div className="px-3 py-2 bg-gray-900 border-b border-gray-800">
      <div className="flex items-start gap-2">
        <div className="flex-1 relative">
          <textarea
            value={query}
            onChange={e => { setQuery(e.target.value); setError(null) }}
            onKeyDown={handleKeyDown}
            rows={2}
            spellCheck={false}
            className="w-full resize-none bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm font-mono text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
            placeholder="MATCH (n) RETURN n LIMIT 25"
          />
          <span className="absolute bottom-2 right-2 text-[10px] text-gray-600 pointer-events-none">
            ⌘↵
          </span>
        </div>
        <div className="flex flex-col gap-1 shrink-0">
          <button
            onClick={handleRun}
            disabled={loading || !query.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white text-sm rounded transition-colors font-medium"
          >
            {loading ? '···' : 'Run'}
          </button>
          <button
            onClick={() => setQuery('')}
            className="px-4 py-1 text-xs text-gray-500 hover:text-gray-300 border border-gray-700 hover:border-gray-600 rounded transition-colors"
          >
            Clear
          </button>
        </div>
      </div>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  )
}
