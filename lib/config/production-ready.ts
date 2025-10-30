/**
 * Production-Ready Configuration
 * Complete production setup for Phase 1 delivery
 */

export const productionConfig = {
  // Azure Configuration
  azure: {
    cosmos: {
      endpoint: process.env.AZURE_COSMOS_ENDPOINT!,
      key: process.env.AZURE_COSMOS_KEY!,
      databaseId: 'BenefitsDB',
      containers: {
        users: 'users',
        companies: 'companies',
        documents: 'documents',
        chats: 'chats',
        analytics: 'analytics',
        searchIndex: 'searchIndex'
      }
    },
    storage: {
      connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING!,
      containerName: 'documents'
    },
    openai: {
      endpoint: process.env.AZURE_OPENAI_ENDPOINT!,
      apiKey: process.env.AZURE_OPENAI_API_KEY!,
      apiVersion: '2024-02-15-preview',
      models: {
        gpt4: 'gpt-4',
        gpt35: 'gpt-3.5-turbo'
      }
    },
    adb2c: {
      tenantId: process.env.AZURE_AD_B2C_TENANT_ID!,
      clientId: process.env.AZURE_AD_B2C_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_B2C_CLIENT_SECRET!,
      policyName: process.env.AZURE_AD_B2C_POLICY_NAME || 'B2C_1_signupsignin'
    },
    redis: {
      connectionString: process.env.AZURE_REDIS_CONNECTION_STRING!
    }
  },

  // Application Configuration
  app: {
    name: 'Benefits Assistant',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'production',
    port: parseInt(process.env.PORT || '3000'),
    host: process.env.HOST || '0.0.0.0',
    url: process.env.APP_URL || 'https://benefits-assistant.azurewebsites.net'
  },

  // Security Configuration
  security: {
    jwt: {
      secret: process.env.JWT_SECRET!,
      expiresIn: '24h'
    },
    cors: {
      origin: process.env.CORS_ORIGIN?.split(',') || ['https://benefits-assistant.azurewebsites.net'],
      credentials: true
    },
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      standardHeaders: true,
      legacyHeaders: false
    }
  },

  // Monitoring Configuration
  monitoring: {
    applicationInsights: {
      connectionString: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING!
    },
    logging: {
      level: process.env.LOG_LEVEL || 'info',
      format: 'json'
    }
  },

  // Feature Flags
  features: {
    hybridLLM: true,
    documentProcessing: true,
    realTimeAnalytics: true,
    multiTenant: true,
    costMonitoring: true
  },

  // Performance Configuration
  performance: {
    cache: {
      ttl: 300, // 5 minutes
      maxSize: 1000
    },
    pagination: {
      defaultLimit: 20,
      maxLimit: 100
    }
  }
};

// Validation function
export function validateProductionConfig() {
  const required = [
    'AZURE_COSMOS_ENDPOINT',
    'AZURE_COSMOS_KEY',
    'AZURE_STORAGE_CONNECTION_STRING',
    'AZURE_OPENAI_ENDPOINT',
    'AZURE_OPENAI_API_KEY',
    'AZURE_AD_B2C_TENANT_ID',
    'AZURE_AD_B2C_CLIENT_ID',
    'AZURE_AD_B2C_CLIENT_SECRET',
    'JWT_SECRET',
    'APPLICATIONINSIGHTS_CONNECTION_STRING'
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return true;
}
