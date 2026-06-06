import { Elysia } from 'elysia'
import driver from '../neo4j'

export const schemaRoute = new Elysia().get('/api/schema', async () => {
  const session = driver.session({ database: process.env.NEO4J_DATABASE! })
  try {
    const labelsRes = await session.run('CALL db.labels() YIELD label RETURN collect(label) AS labels')
    const typesRes = await session.run('CALL db.relationshipTypes() YIELD relationshipType RETURN collect(relationshipType) AS types')

    const nodeLabels: string[] = labelsRes.records[0]?.get('labels') ?? []
    const relationshipTypes: string[] = typesRes.records[0]?.get('types') ?? []

    return { nodeLabels, relationshipTypes }
  } finally {
    await session.close()
  }
})
