import { config as loadEnv } from 'dotenv'
import { z } from 'zod'

loadEnv()

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_JWT_AUDIENCE: z.string().default('authenticated'),
  STRIPE_SECRET_KEY:     z.string().default('sk_test_placeholder'),
  STRIPE_WEBHOOK_SECRET: z.string().default('whsec_placeholder'),
  ZOOM_ACCOUNT_ID:       z.string().default(''),
  ZOOM_CLIENT_ID:        z.string().default(''),
  ZOOM_CLIENT_SECRET:    z.string().default(''),
  ZOOM_WEBHOOK_SECRET:   z.string().default(''),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  const formatted = parsed.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('\n')
  throw new Error(`Invalid environment variables:\n${formatted}`)
}

export const env = parsed.data

export const ROLE_TYPES = ['student', 'admin', 'affiliate', 'teacher', 'editor'] as const
export type RoleType = (typeof ROLE_TYPES)[number]
