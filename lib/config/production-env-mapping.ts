/**
 * Production Environment Variable Mapping
 * 
 * This module maps Vercel environment variables to the expected service configuration
 * following Google's production environment management best practices.
 */

export const PRODUCTION_ENV_MAPPING = {
  // Cosmos DB Configuration
  COSMOS_DB_ENDPOINT: process.env.AZURE_COSMOS_ENDPOINT || process.env.COSMOS_DB_ENDPOINT,
  COSMOS_DB_KEY: process.env.AZURE_COSMOS_KEY || process.env.COSMOS_DB_KEY,
  COSMOS_DB_DATABASE: process.env.AZURE_COSMOS_DATABASE || 'BenefitsChat',
  
  // Redis Configuration
  REDIS_URL: process.env.REDIS_URL || process.env.AZURE_REDIS_URL,
  REDIS_HOST: process.env.AZURE_REDIS_HOST,
  REDIS_PORT: process.env.AZURE_REDIS_PORT || '6380',
  REDIS_PASSWORD: process.env.AZURE_REDIS_PASSWORD,
  REDIS_SSL: process.env.AZURE_REDIS_SSL === 'true',
  
  // OpenAI Configuration
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || process.env.AZURE_OPENAI_API_KEY,
  AZURE_OPENAI_ENDPOINT: process.env.AZURE_OPENAI_ENDPOINT,
  AZURE_OPENAI_API_VERSION: process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview',
  AZURE_OPENAI_DEPLOYMENT_NAME: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4',
  
  // Storage Configuration
  AZURE_STORAGE_CONNECTION_STRING: process.env.AZURE_STORAGE_CONNECTION_STRING,
  AZURE_STORAGE_ACCOUNT: process.env.AZURE_STORAGE_ACCOUNT,
  AZURE_STORAGE_KEY: process.env.AZURE_STORAGE_KEY,
  
  // Authentication
  JWT_SECRET: process.env.JWT_SECRET,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
  
  // Application Configuration
  NODE_ENV: process.env.NODE_ENV || 'production',
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  
  // Analytics and Monitoring
  APPLICATIONINSIGHTS_CONNECTION_STRING: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING,
  AZURE_LOG_ANALYTICS_WORKSPACE_ID: process.env.AZURE_LOG_ANALYTICS_WORKSPACE_ID,
  
  // Rate Limiting
  RATE_LIMIT_REDIS_URL: process.env.RATE_LIMIT_REDIS_URL || process.env.REDIS_URL,
  RATE_LIMIT_REQUESTS_PER_MINUTE: process.env.RATE_LIMIT_REQUESTS_PER_MINUTE || '60',
  RATE_LIMIT_BURST: process.env.RATE_LIMIT_BURST || '10',
  
  // Feature Flags
  ENABLE_ANALYTICS: process.env.ENABLE_ANALYTICS === 'true',
  ENABLE_CACHING: process.env.ENABLE_CACHING !== 'false',
  ENABLE_RATE_LIMITING: process.env.ENABLE_RATE_LIMITING !== 'false',
  
  // Azure Resource Information
  AZURE_SUBSCRIPTION_ID: process.env.AZURE_SUBSCRIPTION_ID,
  AZURE_RESOURCE_GROUP: process.env.AZURE_RESOURCE_GROUP,
  AZURE_LOCATION: process.env.AZURE_LOCATION,
  
  // External Services
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  DATABASE_URL: process.env.DATABASE_URL,
};

/**
 * Get production environment configuration
 * This function provides a unified interface for accessing environment variables
 * with proper fallbacks and type safety.
 */
export function getProductionConfig() {
  return {
    // Database Configuration
    cosmos: {
      endpoint: PRODUCTION_ENV_MAPPING.COSMOS_DB_ENDPOINT,
      key: PRODUCTION_ENV_MAPPING.COSMOS_DB_KEY,
      database: PRODUCTION_ENV_MAPPING.COSMOS_DB_DATABASE,
    },
    
    // Cache Configuration
    redis: {
      url: PRODUCTION_ENV_MAPPING.REDIS_URL,
      host: PRODUCTION_ENV_MAPPING.REDIS_HOST,
      port: parseInt(PRODUCTION_ENV_MAPPING.REDIS_PORT || '6379'),
      password: PRODUCTION_ENV_MAPPING.REDIS_PASSWORD,
      ssl: PRODUCTION_ENV_MAPPING.REDIS_SSL,
    },
    
    // AI Configuration
    openai: {
      apiKey: PRODUCTION_ENV_MAPPING.OPENAI_API_KEY,
      endpoint: PRODUCTION_ENV_MAPPING.AZURE_OPENAI_ENDPOINT,
      apiVersion: PRODUCTION_ENV_MAPPING.AZURE_OPENAI_API_VERSION,
      deploymentName: PRODUCTION_ENV_MAPPING.AZURE_OPENAI_DEPLOYMENT_NAME,
    },
    
    // Storage Configuration
    storage: {
      connectionString: PRODUCTION_ENV_MAPPING.AZURE_STORAGE_CONNECTION_STRING,
      account: PRODUCTION_ENV_MAPPING.AZURE_STORAGE_ACCOUNT,
      key: PRODUCTION_ENV_MAPPING.AZURE_STORAGE_KEY,
    },
    
    // Authentication
    auth: {
      jwtSecret: PRODUCTION_ENV_MAPPING.JWT_SECRET,
      nextAuthSecret: PRODUCTION_ENV_MAPPING.NEXTAUTH_SECRET,
      encryptionKey: PRODUCTION_ENV_MAPPING.ENCRYPTION_KEY,
    },
    
    // Application
    app: {
      nodeEnv: PRODUCTION_ENV_MAPPING.NODE_ENV,
      publicUrl: PRODUCTION_ENV_MAPPING.NEXT_PUBLIC_APP_URL,
      logLevel: PRODUCTION_ENV_MAPPING.LOG_LEVEL,
    },
    
    // Monitoring
    monitoring: {
      appInsights: PRODUCTION_ENV_MAPPING.APPLICATIONINSIGHTS_CONNECTION_STRING,
      logAnalytics: PRODUCTION_ENV_MAPPING.AZURE_LOG_ANALYTICS_WORKSPACE_ID,
    },
    
    // Rate Limiting
    rateLimit: {
      redisUrl: PRODUCTION_ENV_MAPPING.RATE_LIMIT_REDIS_URL,
      requestsPerMinute: parseInt(PRODUCTION_ENV_MAPPING.RATE_LIMIT_REQUESTS_PER_MINUTE || '60'),
      burst: parseInt(PRODUCTION_ENV_MAPPING.RATE_LIMIT_BURST || '10'),
    },
    
    // Feature Flags
    features: {
      analytics: PRODUCTION_ENV_MAPPING.ENABLE_ANALYTICS,
      caching: PRODUCTION_ENV_MAPPING.ENABLE_CACHING,
      rateLimiting: PRODUCTION_ENV_MAPPING.ENABLE_RATE_LIMITING,
    },
  };
}

/**
 * Validate production configuration
 * This function ensures all required environment variables are present
 * and properly configured for production deployment.
 */
export function validateProductionConfig(): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Critical configuration validation
  if (!PRODUCTION_ENV_MAPPING.COSMOS_DB_ENDPOINT) {
    errors.push('COSMOS_DB_ENDPOINT is required for production');
  }
  
  if (!PRODUCTION_ENV_MAPPING.COSMOS_DB_KEY) {
    errors.push('COSMOS_DB_KEY is required for production');
  }
  
  if (!PRODUCTION_ENV_MAPPING.REDIS_URL && !PRODUCTION_ENV_MAPPING.REDIS_HOST) {
    errors.push('REDIS_URL or REDIS_HOST is required for production');
  }
  
  if (!PRODUCTION_ENV_MAPPING.OPENAI_API_KEY) {
    errors.push('OPENAI_API_KEY is required for production');
  }
  
  if (!PRODUCTION_ENV_MAPPING.JWT_SECRET) {
    errors.push('JWT_SECRET is required for production');
  }
  
  // Warning for optional but recommended configuration
  if (!PRODUCTION_ENV_MAPPING.APPLICATIONINSIGHTS_CONNECTION_STRING) {
    warnings.push('APPLICATIONINSIGHTS_CONNECTION_STRING is recommended for production monitoring');
  }
  
  if (!PRODUCTION_ENV_MAPPING.AZURE_STORAGE_CONNECTION_STRING) {
    warnings.push('AZURE_STORAGE_CONNECTION_STRING is recommended for document storage');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Get environment-specific configuration
 * This function returns configuration optimized for the current environment.
 */
export function getEnvironmentConfig() {
  const config = getProductionConfig();
  const validation = validateProductionConfig();
  
  return {
    ...config,
    validation,
    isProduction: PRODUCTION_ENV_MAPPING.NODE_ENV === 'production',
    isDevelopment: PRODUCTION_ENV_MAPPING.NODE_ENV === 'development',
    isTest: PRODUCTION_ENV_MAPPING.NODE_ENV === 'test',
  };
}
