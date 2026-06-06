import { useState, useEffect, useCallback } from 'react'
import { fetchGraph, runCypher, type ApiNode, type ApiEdge } from '../api/client'

export interface FGNode {
  id: string
  label: string
  labels: string[]
  name: string
  properties: Record<string, unknown>
  x?: number
  y?: number
  vx?: number
  vy?: number
  fx?: number
  fy?: number
  [key: string]: unknown
}

export interface FGLink {
  id: string
  source: string | FGNode
  target: string | FGNode
  type: string
  properties: Record<string, unknown>
  [key: string]: unknown
}

export interface FGGraphData {
  nodes: FGNode[]
  links: FGLink[]
}

function primaryLabel(labels: string[]): string {
  return labels.find(l => l !== '__Entity__' && l !== 'Document') ?? labels[0] ?? 'Unknown'
}

function displayName(node: ApiNode): string {
  const p = node.properties
  return String(p['id'] ?? p['name'] ?? p['title'] ?? node.id)
}

function toFGData(nodes: ApiNode[], edges: ApiEdge[]): FGGraphData {
  const fgNodes: FGNode[] = nodes.map(n => ({
    ...n,
    label: primaryLabel(n.labels),
    name: displayName(n),
  }))

  const nodeSet = new Set(fgNodes.map(n => n.id))

  const fgLinks: FGLink[] = edges
    .filter(e => nodeSet.has(e.startNodeId) && nodeSet.has(e.endNodeId))
    .map(e => ({
      id: e.id,
      source: e.startNodeId,
      target: e.endNodeId,
      type: e.type,
      properties: e.properties,
    }))

  return { nodes: fgNodes, links: fgLinks }
}

export function useGraph() {
  const [graphData, setGraphData] = useState<FGGraphData>({ nodes: [], links: [] })
  const [allLabels, setAllLabels] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async (loader: () => Promise<{ nodes: ApiNode[]; edges: ApiEdge[] }>) => {
    setLoading(true)
    setError(null)
    try {
      const data = await loader()
      const fg = toFGData(data.nodes, data.edges)
      setGraphData(fg)
      const labels = [...new Set(fg.nodes.map(n => n.label))].sort()
      setAllLabels(labels)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  const reload = useCallback(() => loadData(fetchGraph), [loadData])

  const runQuery = useCallback(
    (query: string) => loadData(() => runCypher(query)),
    [loadData]
  )

  useEffect(() => {
    reload()
  }, [reload])

  return { graphData, allLabels, loading, error, reload, runQuery }
}
