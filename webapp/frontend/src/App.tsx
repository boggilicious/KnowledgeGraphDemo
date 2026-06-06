import { useState, useEffect } from 'react'
import GraphViewer from './components/GraphViewer'
import DetailPanel from './components/DetailPanel'
import CypherEditor from './components/CypherEditor'
import LabelFilter from './components/LabelFilter'
import StatusBar from './components/StatusBar'
import { useGraph, type FGNode } from './hooks/useGraph'

export default function App() {
  const { graphData, allLabels, loading, error, reload, runQuery } = useGraph()
  const [activeLabels, setActiveLabels] = useState<Set<string>>(new Set())
  const [selectedNode, setSelectedNode] = useState<FGNode | null>(null)
  const [showCypher, setShowCypher] = useState(false)

  // Keep activeLabels in sync when new labels arrive
  useEffect(() => {
    setActiveLabels(new Set(allLabels))
  }, [allLabels])

  function toggleLabel(label: string) {
    setActiveLabels(prev => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }

  const visibleNodeCount = graphData.nodes.filter(n => activeLabels.has(n.label)).length

  return (
    <div className="flex flex-col h-screen bg-[#0a0a14] text-gray-100">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 h-11 bg-gray-900 border-b border-gray-800 shrink-0">
        <span className="text-blue-400 font-bold text-sm tracking-widest uppercase shrink-0">
          KnowledgeDB
        </span>

        <div className="flex-1 min-w-0 overflow-hidden">
          <LabelFilter
            labels={allLabels}
            activeLabels={activeLabels}
            onToggle={toggleLabel}
          />
        </div>

        <button
          onClick={() => setShowCypher(v => !v)}
          title="Toggle Cypher editor"
          className={`shrink-0 text-xs px-2.5 py-1 rounded border font-mono transition-colors ${
            showCypher
              ? 'border-blue-500 text-blue-400 bg-blue-500/10'
              : 'border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200'
          }`}
        >
          {'{ }'}
        </button>

        <button
          onClick={reload}
          disabled={loading}
          title="Reload graph"
          className="shrink-0 text-sm w-7 h-7 flex items-center justify-center rounded border border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200 disabled:opacity-40 transition-colors"
        >
          ↺
        </button>
      </header>

      {/* Cypher panel */}
      {showCypher && (
        <CypherEditor onRun={runQuery} loading={loading} />
      )}

      {/* Main area */}
      <div className="flex flex-1 min-h-0">
        <GraphViewer
          graphData={graphData}
          activeLabels={activeLabels}
          selectedNode={selectedNode}
          onNodeClick={node => setSelectedNode(prev => prev?.id === node.id ? null : node)}
        />

        {selectedNode && (
          <DetailPanel
            node={selectedNode}
            onClose={() => setSelectedNode(null)}
          />
        )}
      </div>

      {/* Status bar */}
      <StatusBar
        nodeCount={graphData.nodes.length}
        edgeCount={graphData.links.length}
        visibleNodeCount={visibleNodeCount}
        loading={loading}
        error={error}
      />
    </div>
  )
}
