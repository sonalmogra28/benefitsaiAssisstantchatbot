/**
 * Centralized Environment Configuration
 * Sanitizes all environment variables by removing CR/LF and trimming whitespace
 * Throws on missing required values to fail fast at startup
 */

const req = (k: string): string => {
  const v = process.env[k];
  if (!v) throw new Error(`Missing required environment variable: ${k}`);
  return v.replace(/[\r\n]+/g, '').trim();
};

const opt = (k: string, fallback: string): string => {
  const v = process.env[k];
  if (!v) return fallback;
  return v.replace(/[\r\n]+/g, '').trim();
};

export const ENV = {
  // Azure OpenAI
  AZURE_OPENAI_ENDPOINT: req('AZURE_OPENAI_ENDPOINT'),
  AZURE_OPENAI_API_KEY: req('AZURE_OPENAI_API_KEY'),
  AZURE_OPENAI_API_VERSION: opt('AZURE_OPENAI_API_VERSION', '2024-02-15-preview'),
  AZURE_OPENAI_DEPLOYMENT_L1: req('AZURE_OPENAI_DEPLOYMENT_L1'),
  AZURE_OPENAI_DEPLOYMENT_L2: opt('AZURE_OPENAI_DEPLOYMENT_L2', process.env['AZURE_OPENAI_DEPLOYMENT_L1'] || 'gpt-4o-mini'),
  AZURE_OPENAI_DEPLOYMENT_L3: opt('AZURE_OPENAI_DEPLOYMENT_L3', process.env['AZURE_OPENAI_DEPLOYMENT_L2'] || process.env['AZURE_OPENAI_DEPLOYMENT_L1'] || 'gpt-4o-mini'),
  AZURE_OPENAI_EMBEDDING_DEPLOYMENT: req('AZURE_OPENAI_EMBEDDING_DEPLOYMENT'),

  // Azure AI Search
  AZURE_SEARCH_ENDPOINT: req('AZURE_SEARCH_ENDPOINT'),
  AZURE_SEARCH_API_KEY: req('AZURE_SEARCH_API_KEY'),
  AZURE_SEARCH_INDEX_NAME: opt('AZURE_SEARCH_INDEX_NAME', 'chunks_prod_v1'),
  AZURE_SEARCH_VECTOR_FIELD: opt('AZURE_SEARCH_VECTOR_FIELD', 'content_vector'),

  // Azure Cosmos DB
  AZURE_COSMOS_ENDPOINT: req('AZURE_COSMOS_ENDPOINT'),
  AZURE_COSMOS_KEY: req('AZURE_COSMOS_KEY'),

  // Redis
  REDIS_URL: req('REDIS_URL'),
  RATE_LIMIT_REDIS_URL: opt('RATE_LIMIT_REDIS_URL', process.env['REDIS_URL'] || ''),

  // Azure Storage
  AZURE_STORAGE_CONNECTION_STRING: req('AZURE_STORAGE_CONNECTION_STRING'),

  // NextAuth
  NEXTAUTH_URL: req('NEXTAUTH_URL'),
  NEXTAUTH_SECRET: req('NEXTAUTH_SECRET'),

  // Environment info
  VERCEL_ENV: opt('VERCEL_ENV', 'unknown'),
  NODE_ENV: opt('NODE_ENV', 'production'),
  NEXT_PUBLIC_ENVIRONMENT: opt('NEXT_PUBLIC_ENVIRONMENT', 'production'),
} as const;

// Legacy export for backwards compatibility
export const env = {
  NODE_ENV: ENV.NODE_ENV,
};
