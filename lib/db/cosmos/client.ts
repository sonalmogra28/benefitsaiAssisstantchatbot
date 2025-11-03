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

import 'server-only';
import { CosmosClient, CosmosClientOptions, Container, Database } from '@azure/cosmos';

/**
 * Check if we're in build phase (Next.js static analysis)
 */
function isBuild(): boolean {
  return process.env.NEXT_PHASE === 'phase-production-build';
}

/**
 * Environment configuration with validation
 */
function getCosmosConfig() {
  if (isBuild()) {
    // Return dummy config during build
    return {
      endpoint: 'https://localhost:8081',
      key: 'dummy-key-for-build',
      database: 'benefits-assistant'
    };
  }
  
  const COSMOS_ENDPOINT = process.env.AZURE_COSMOS_ENDPOINT;
  const COSMOS_KEY = process.env.AZURE_COSMOS_KEY;
  const COSMOS_DATABASE = process.env.AZURE_COSMOS_DATABASE || 'benefits-assistant';

  if (!COSMOS_ENDPOINT || !COSMOS_KEY) {
    throw new Error(
      'Missing required Cosmos DB configuration. Please set AZURE_COSMOS_ENDPOINT and AZURE_COSMOS_KEY environment variables.'
    );
  }
  
  return {
    endpoint: COSMOS_ENDPOINT,
    key: COSMOS_KEY,
    database: COSMOS_DATABASE
  };
}

/**
 * Cosmos Client Configuration
 * Following Azure best practices for production deployments
 */
function getCosmosClientOptions(): CosmosClientOptions {
  const config = getCosmosConfig();
  return {
    endpoint: config.endpoint,
    key: config.key,
    connectionPolicy: {
      // Connection pooling for better performance
      requestTimeout: 10000,
      enableEndpointDiscovery: true,
      preferredLocations: ['East US 2', 'West US 2'], // Multi-region failover
      retryOptions: {
        maxRetryAttemptCount: 3,
        fixedRetryIntervalInMilliseconds: 300,
        maxWaitTimeInSeconds: 30,
      },
    },
    // Consistent session for read-your-writes guarantee
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
  
  if (!cosmosClient) {
    const config = getCosmosConfig();
    const cs = process.env.AZURE_COSMOS_CONNECTION_STRING;
    
    if (!cs && (!config.endpoint || !config.key)) {
      throw new Error('COSMOS_MISSING: No connection string or credentials available');
    }
    
    cosmosClient = new CosmosClient(getCosmosClientOptions());
  }
  return cosmosClient;
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
    const config = getCosmosConfig();
    database = client.database(config.database);
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
