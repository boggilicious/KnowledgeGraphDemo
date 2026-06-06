import { useRef, useEffect, useState, useCallback } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import type { FGNode, FGLink, FGGraphData } from '../hooks/useGraph'
import { getColor } from '../utils/colors'

interface Props {
  graphData: FGGraphData
  activeLabels: Set<string>
  selectedNode: FGNode | null
  onNodeClick: (node: FGNode) => void
}

export default function GraphViewer({ graphData, activeLabels, selectedNode, onNodeClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      setDimensions({ width: Math.floor(width), height: Math.floor(height) })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const nodeVisibility = useCallback(
    (node: object) => activeLabels.has((node as FGNode).label),
    [activeLabels]
  )

  const linkVisibility = useCallback(
    (link: object) => {
      const l = link as FGLink
      const src = typeof l.source === 'object' ? (l.source as FGNode) : null
      const tgt = typeof l.target === 'object' ? (l.target as FGNode) : null
      if (!src || !tgt) return true
      return activeLabels.has(src.label) && activeLabels.has(tgt.label)
    },
    [activeLabels]
  )

  const paintNode = useCallback(
    (node: object, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const n = node as FGNode
      const x = n.x ?? 0
      const y = n.y ?? 0
      const r = 5
      const color = getColor(n.label)

      // Glow for selected node
      if (selectedNode?.id === n.id) {
        ctx.beginPath()
        ctx.arc(x, y, r + 4, 0, Math.PI * 2)
        ctx.fillStyle = color + '40'
        ctx.fill()
      }

      // Node circle
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.fill()

      // Selection ring
      if (selectedNode?.id === n.id) {
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 1.5 / globalScale
        ctx.stroke()
      }

      // Label — show when zoomed in enough
      if (globalScale >= 1.2) {
        const fontSize = Math.max(10 / globalScale, 3)
        const label = n.name || n.id
        ctx.font = `${fontSize}px system-ui, -apple-system, sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.fillStyle = 'rgba(255,255,255,0.75)'
        ctx.fillText(label, x, y + r + 2 / globalScale)
      }
    },
    [selectedNode]
  )

  const pointerAreaPaint = useCallback(
    (node: object, color: string, ctx: CanvasRenderingContext2D) => {
      const n = node as FGNode
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(n.x ?? 0, n.y ?? 0, 7, 0, Math.PI * 2)
      ctx.fill()
    },
    []
  )

  const nodeTooltip = useCallback((node: object) => {
    const n = node as FGNode
    const rows = Object.entries(n.properties)
      .filter(([k]) => k !== 'embedding')
      .slice(0, 6)
      .map(([k, v]) => {
        const val = String(v ?? '').slice(0, 80)
        return `<tr><td style="color:#9ca3af;padding-right:8px">${k}</td><td>${val}</td></tr>`
      })
      .join('')
    return `<div style="background:#1f2937;border:1px solid #374151;padding:10px 12px;border-radius:8px;font-size:12px;color:#e5e7eb;max-width:320px">
      <div style="font-weight:600;margin-bottom:4px">${n.name}</div>
      <div style="color:#6b7280;font-size:11px;margin-bottom:${rows ? '8px' : '0'}">${n.labels.join(' · ')}</div>
      ${rows ? `<table style="border-collapse:collapse">${rows}</table>` : ''}
    </div>`
  }, [])

  const handleNodeClick = useCallback(
    (node: object) => onNodeClick(node as FGNode),
    [onNodeClick]
  )

  return (
    <div ref={containerRef} className="flex-1 min-w-0 min-h-0">
      <ForceGraph2D
        width={dimensions.width}
        height={dimensions.height}
        graphData={graphData as never}
        nodeVisibility={nodeVisibility}
        linkVisibility={linkVisibility}
        nodeCanvasObject={paintNode}
        nodeCanvasObjectMode={() => 'replace'}
        nodePointerAreaPaint={pointerAreaPaint}
        nodeLabel={nodeTooltip}
        onNodeClick={handleNodeClick}
        linkColor={() => 'rgba(255,255,255,0.18)'}
        linkWidth={1}
        linkDirectionalArrowLength={4}
        linkDirectionalArrowRelPos={1}
        linkDirectionalArrowColor={() => 'rgba(255,255,255,0.35)'}
        linkLabel={(link: object) => (link as FGLink).type}
        backgroundColor="#0a0a14"
        cooldownTicks={100}
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.3}
      />
    </div>
  )
}
