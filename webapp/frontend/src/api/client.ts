export interface ApiNode {
  id: string
  labels: string[]
  properties: Record<string, unknown>
}

export interface ApiEdge {
  id: string
  type: string
  startNodeId: string
  endNodeId: string
  properties: Record<string, unknown>
}

export interface ApiGraphData {
  nodes: ApiNode[]
  edges: ApiEdge[]
}

export async function fetchGraph(): Promise<ApiGraphData> {
  const res = await fetch('/api/graph')
  if (!res.ok) throw new Error(`Failed to load graph: ${res.statusText}`)
  return res.json()
}

export async function runCypher(query: string): Promise<ApiGraphData> {
  const res = await fetch('/api/cypher', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `Query failed: ${res.statusText}`)
  return data as ApiGraphData
}
