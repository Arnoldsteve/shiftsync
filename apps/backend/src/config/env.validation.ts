import { z } from 'zod';

const envSchema = z.object({
  // Node environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // API configuration
  API_PORT: z.string().transform(Number).pipe(z.number().positive()).default('3001'),

  // Database
  DATABASE_URL: z.string().url('Invalid DATABASE_URL'),

  // Redis
  REDIS_URL: z.string().url('Invalid REDIS_URL'),

  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('24h'),

  // Frontend URL for CORS
  FRONTEND_URL: z.string().url().optional().default('http://localhost:3000'),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  try {
    return envSchema.parse(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map((err) => `${err.path.join('.')}: ${err.message}`);
      throw new Error(`Environment validation failed:\n${errors.join('\n')}`);
    }
    throw error;
  }
}
