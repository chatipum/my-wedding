import { defineConfig } from 'drizzle-kit'
import { requireDatabaseUrl } from './src/db/env'

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: requireDatabaseUrl(process.env.DATABASE_URL) },
})
