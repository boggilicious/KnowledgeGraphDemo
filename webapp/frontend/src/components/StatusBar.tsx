interface Props {
  nodeCount: number
  edgeCount: number
  visibleNodeCount: number
  loading: boolean
  error: string | null
}

export default function StatusBar({ nodeCount, edgeCount, visibleNodeCount, loading, error }: Props) {
  const filtered = visibleNodeCount < nodeCount

  return (
    <div className="flex items-center gap-4 px-4 h-7 bg-gray-900 border-t border-gray-800 text-xs text-gray-500 shrink-0 select-none">
      <span>
        {filtered ? (
          <span>
            <span className="text-gray-300">{visibleNodeCount}</span>
            <span className="text-gray-600"> / {nodeCount}</span> nodes
          </span>
        ) : (
          <span><span className="text-gray-300">{nodeCount}</span> nodes</span>
        )}
      </span>
      <span><span className="text-gray-300">{edgeCount}</span> edges</span>
      <span className="flex-1" />
      {loading && (
        <span className="flex items-center gap-1 text-blue-400">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
          Loading
        </span>
      )}
      {!loading && error && (
        <span className="text-red-400 truncate max-w-xs" title={error}>{error}</span>
      )}
      {!loading && !error && (
        <span className="flex items-center gap-1 text-green-500">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500" />
          Connected
        </span>
      )}
      <span className="text-gray-700">Neo4j AuraDB</span>
    </div>
  )
}
