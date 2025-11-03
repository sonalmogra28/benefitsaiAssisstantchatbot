/**
 * Azure Cosmos DB Client
 * Production-grade database client with connection pooling, retry logic, and error handling
 * 
 * Best Practices Implemented:
 * - Singleton pattern for connection reuse
 * - Environment-based configuration
 * - Secure credential management
 * - Connection pooling and retry policies
 * - Comprehensive error handling
 * - Type-safe operations
 */

import { CosmosClient, CosmosClientOptions, Container, Database } from '@azure/cosmos';

// Hard runtime guards - prevent browser/edge usage
if (typeof window !== 'undefined') {
  throw new Error('Cosmos client imported in the browser. Import only in server code.');
}
if (process.env.NEXT_RUNTIME === 'edge') {
  throw new Error('Cosmos client not supported on the Edge runtime. Use nodejs runtime.');
}

type GlobalForCosmos = typeof globalThis & { __cosmosClient?: CosmosClient };
const g = globalThis as GlobalForCosmos;

/**
 * Check if we're in build phase (Next.js static analysis)
 */
function isBuild(): boolean {
  return process.env.NEXT_PHASE === 'phase-production-build';
}

/**
 * Cosmos Client Configuration
 * Following Azure best practices for production deployments
 */
function getCosmosClientOptions(): CosmosClientOptions {
  const connectionString = process.env.AZURE_COSMOS_CONNECTION_STRING;
  
  if (!connectionString) {
    throw new Error('Missing AZURE_COSMOS_CONNECTION_STRING environment variable');
  }
  
  const endpoint = connectionString.match(/AccountEndpoint=([^;]+)/)?.[1];
  const key = connectionString.match(/AccountKey=([^;]+)/)?.[1];
  
  if (!endpoint || !key) {
    throw new Error('Invalid AZURE_COSMOS_CONNECTION_STRING format');
  }
  
  return {
    endpoint,
    key,
    userAgentSuffix: 'benefits-ai-chatbot',
    connectionPolicy: {
      requestTimeout: 10000,
      enableEndpointDiscovery: true,
      preferredLocations: ['East US 2', 'West US 2'],
      retryOptions: {
        maxRetryAttemptCount: 3,
        fixedRetryIntervalInMilliseconds: 300,
        maxWaitTimeInSeconds: 30,
      },
    },
    consistencyLevel: 'Session',
  };
}

/**
 * Singleton Cosmos Client
 * Reuses connections across requests for optimal performance
 */
let cosmosClient: CosmosClient | null = null;
let database: Database | null = null;

/**
 * Get or create Cosmos Client instance
 * Lazy initialization - only creates client when actually called at runtime
 */
export function getCosmosClient(): CosmosClient {
  if (isBuild()) {
    throw new Error('COSMOS_MISSING: Cannot access Cosmos DB during build phase');
  }
  
  if (!g.__cosmosClient) {
    g.__cosmosClient = new CosmosClient(getCosmosClientOptions());
  }
  return g.__cosmosClient;
}

/**
 * Get database instance
 * Lazy initialization - only creates database reference when actually called at runtime
 */
export function getDatabase(): Database {
  if (isBuild()) {
    throw new Error('COSMOS_MISSING: Cannot access Cosmos DB during build phase');
  }
  
  if (!database) {
    const client = getCosmosClient();
    const databaseName = process.env.AZURE_COSMOS_DATABASE || 'benefits-assistant';
    database = client.database(databaseName);
  }
  return database;
}

/**
 * Container references
 * Lazy-loaded for optimal performance
 */
export class CosmosContainers {
  private static containers: Map<string, Container> = new Map();

  static getContainer(containerName: string): Container {
    if (!this.containers.has(containerName)) {
      const db = getDatabase();
      this.containers.set(containerName, db.container(containerName));
    }
    return this.containers.get(containerName)!;
  }

  // Named container getters
  static get companies(): Container {
    return this.getContainer('companies');
  }

  static get users(): Container {
    return this.getContainer('users');
  }

  static get documents(): Container {
    return this.getContainer('documents');
  }

  static get conversations(): Container {
    return this.getContainer('conversations');
  }

  static get userSurveys(): Container {
    return this.getContainer('user_surveys');
  }

  static get analyticsDaily(): Container {
    return this.getContainer('analytics_daily');
  }

  static get auditLogs(): Container {
    return this.getContainer('audit_logs');
  }
}

/**
 * Health check for database connectivity
 */
export async function checkCosmosHealth(): Promise<{ healthy: boolean; message: string }> {
  try {
    const db = getDatabase();
    await db.read();
    return { healthy: true, message: 'Cosmos DB connection successful' };
  } catch (error) {
    console.error('Cosmos DB health check failed:', error);
    return {
      healthy: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Graceful shutdown
 * Properly closes connections when application terminates
 */
export async function closeCosmosConnection(): Promise<void> {
  if (cosmosClient) {
    await cosmosClient.dispose();
    cosmosClient = null;
    database = null;
    CosmosContainers['containers'].clear();
  }
}

// Register cleanup on process termination
if (typeof process !== 'undefined') {
  process.on('beforeExit', async () => {
    await closeCosmosConnection();
  });
}
