import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { requireDatabaseUrl } from './env'
import * as schema from './schema'

const client = neon(requireDatabaseUrl(process.env.DATABASE_URL))

export const db = drizzle({
  client,
  schema,
  logger: process.env.APP_ENV === 'development',
})

export { schema }
