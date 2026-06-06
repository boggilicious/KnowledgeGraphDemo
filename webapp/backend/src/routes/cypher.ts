import { Elysia, t } from 'elysia'
import neo4j from 'neo4j-driver'
import driver from '../neo4j'
import { serializeRecord } from '../utils/serialize'

const WRITE_KEYWORDS = ['CREATE', 'MERGE', 'DELETE', 'SET', 'REMOVE', 'DROP']

function isWriteQuery(query: string): boolean {
  const upper = query.toUpperCase()
  return WRITE_KEYWORDS.some(kw => {
    const idx = upper.indexOf(kw)
    if (idx === -1) return false
    const before = upper[idx - 1]
    return !before || /\s/.test(before)
  })
}

export const cypherRoute = new Elysia().post(
  '/api/cypher',
  async ({ body, set }) => {
    const { query } = body

    if (isWriteQuery(query)) {
      set.status = 400
      return { error: 'Write operations are not allowed' }
    }

    const session = driver.session({ database: process.env.NEO4J_DATABASE! })
    try {
      const result = await session.run(query)

      const nodes: object[] = []
      const edges: object[] = []
      const nodeIds = new Set<string>()
      const edgeIds = new Set<string>()

      for (const record of result.records) {
        for (const key of record.keys as string[]) {
          const val = record.get(key)
          if (val instanceof neo4j.types.Node) {
            if (!nodeIds.has(val.elementId)) {
              nodeIds.add(val.elementId)
              nodes.push({
                id: val.elementId,
                labels: val.labels,
                properties: serializeRecord(val.properties),
              })
            }
          } else if (val instanceof neo4j.types.Relationship) {
            if (!edgeIds.has(val.elementId)) {
              edgeIds.add(val.elementId)
              edges.push({
                id: val.elementId,
                type: val.type,
                startNodeId: val.startNodeElementId,
                endNodeId: val.endNodeElementId,
                properties: serializeRecord(val.properties),
              })
            }
          }
        }
      }

      return { nodes, edges }
    } catch (err: unknown) {
      set.status = 500
      return { error: err instanceof Error ? err.message : 'Query failed' }
    } finally {
      await session.close()
    }
  },
  {
    body: t.Object({ query: t.String() }),
  }
)
