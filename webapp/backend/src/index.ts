import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { graphRoute } from './routes/graph'
import { cypherRoute } from './routes/cypher'
import { schemaRoute } from './routes/schema'

const PORT = parseInt(process.env.PORT ?? '3001')

new Elysia()
  .use(cors())
  .use(graphRoute)
  .use(cypherRoute)
  .use(schemaRoute)
  .get('/api/search', ({ set }) => {
    set.status = 501
    return { error: 'Not implemented (v2)' }
  })
  .post('/api/chat', ({ set }) => {
    set.status = 501
    return { error: 'Not implemented (v3)' }
  })
  .listen(PORT, () => {
    console.log(`KnowledgeDB backend running on http://localhost:${PORT}`)
  })
