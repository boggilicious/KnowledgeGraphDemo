import { Elysia } from 'elysia'
import driver from '../neo4j'
import { serializeRecord } from '../utils/serialize'

export const graphRoute = new Elysia().get('/api/graph', async () => {
  const session = driver.session({ database: process.env.NEO4J_DATABASE! })
  try {
    const nodesResult = await session.run('MATCH (n) RETURN n')
    const edgesResult = await session.run('MATCH ()-[r]->() RETURN r')

    const nodes = nodesResult.records.map(r => {
      const n = r.get('n')
      return {
        id: n.elementId as string,
        labels: n.labels as string[],
        properties: serializeRecord(n.properties),
      }
    })

    const edges = edgesResult.records.map(r => {
      const rel = r.get('r')
      return {
        id: rel.elementId as string,
        type: rel.type as string,
        startNodeId: rel.startNodeElementId as string,
        endNodeId: rel.endNodeElementId as string,
        properties: serializeRecord(rel.properties),
      }
    })

    return { nodes, edges }
  } finally {
    await session.close()
  }
})
