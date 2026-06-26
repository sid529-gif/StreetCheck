import { existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import { z } from 'zod'

// Load .env from the monorepo root (two levels up from server/src/)
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootEnv = join(__dirname, '..', '..', '.env')
if (existsSync(rootEnv)) {
  dotenv.config({ path: rootEnv })
} else {
  dotenv.config()
}

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  DATABASE_URL: z.string().url(),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  ANTHROPIC_API_KEY: z.string().optional(),
  AI_SERVICE_URL: z.string().url().default('http://localhost:8001'),
  AI_SERVICE_SECRET: z.string().default('dev-secret'),
  CLOUDINARY_URL: z.string().optional(),
  OVERPASS_FULL_CITY: z
    .string()
    .transform((v) => v === 'true')
    .default('false'),
  OVERPASS_API_URL: z.string().url().default('https://overpass-api.de/api/interpreter'),
})

function parseEnv() {
  const result = EnvSchema.safeParse(process.env)
  if (!result.success) {
    console.error('[env] Invalid environment variables:')
    for (const [field, issues] of Object.entries(result.error.flatten().fieldErrors)) {
      console.error(`  ${field}: ${issues?.join(', ') ?? 'unknown'}`)
    }
    process.exit(1)
  }
  return result.data
}

export const env = parseEnv()
export type Env = typeof env
