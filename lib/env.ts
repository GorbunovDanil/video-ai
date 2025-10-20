/**
 * Environment variable validation
 */

const requiredEnvVars = [
  'DATABASE_URL',
  'NEXTAUTH_SECRET',
  'GEMINI_API_KEY',
  'AWS_REGION',
  'ASSETS_BUCKET',
  'CLOUDFRONT_URL',
] as const;

export function validateEnv() {
  const missing: string[] = [];

  for (const varName of requiredEnvVars) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missing.map(v => `  - ${v}`).join('\n')}\n\n` +
      `Please set these in your .env.local file.`
    );
  }
}