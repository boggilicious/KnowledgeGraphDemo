import neo4j, { type Integer } from 'neo4j-driver'

type JsonValue = string | number | boolean | null | JsonValue[] | { [k: string]: JsonValue }

export function serializeValue(value: unknown): JsonValue {
  if (value === null || value === undefined) return null
  if (neo4j.isInt(value as Parameters<typeof neo4j.isInt>[0])) {
    return (value as Integer).toNumber()
  }
  if (Array.isArray(value)) return value.map(serializeValue)
  if (typeof value === 'object') {
    return serializeRecord(value as Record<string, unknown>)
  }
  return value as JsonValue
}

export function serializeRecord(props: Record<string, unknown>): { [k: string]: JsonValue } {
  const out: { [k: string]: JsonValue } = {}
  for (const [k, v] of Object.entries(props)) {
    if (k === 'embedding') continue
    out[k] = serializeValue(v)
  }
  return out
}
