/**
 * Service Factory - Enterprise-Grade Service Management
 * 
 * This module implements the Factory pattern with lazy initialization,
 * following Google/Apple's best practices for production systems.
 * 
 * Key Principles:
 * - Lazy initialization (services created only when needed)
 * - Graceful degradation (fallbacks when services unavailable)
 * - Environment awareness (different behavior per environment)
 * - Comprehensive error handling
 * - Performance optimization
 */

import { logger } from '@/lib/logger';
import { environmentManager, isServiceRequired, shouldUseMockService } from '@/lib/config/environment';

// Service state management
interface ServiceState {
  initialized: boolean;
  available: boolean;
  lastError?: Error;
  retryCount: number;
  maxRetries: number;
}

// Service factory registry
class ServiceFactory {
  private services = new Map<string, any>();
  private serviceStates = new Map<string, ServiceState>();
  private initializers = new Map<string, () => Promise<any>>();

  constructor() {
    this.setupServiceInitializers();
  }

  private setupServiceInitializers() {
    // Cosmos DB initializer
    this.initializers.set('cosmos', async () => {
      if (shouldUseMockService('cosmos')) {
        return this.createMockCosmosClient();
      }
      
      const { CosmosClient } = await import('@azure/cosmos');
      const config = environmentManager.getServiceConfig('cosmos');
      
      if (!config.endpoint || !config.key) {
        throw new Error('Cosmos DB configuration missing');
      }
      
      return new CosmosClient({ 
        endpoint: config.endpoint, 
        key: config.key 
      });
    });

    // Redis initializer
    this.initializers.set('redis', async () => {
      if (shouldUseMockService('redis')) {
        return this.createMockRedisClient();
      }
      
      const { createClient } = await import('redis');
      const config = environmentManager.getServiceConfig('redis');
      const url = config.url || `redis://${config.host}:${config.port}`;
      
      const client = createClient({ url });
      await client.connect();
      return client;
    });

    // OpenAI initializer
    this.initializers.set('openai', async () => {
      if (shouldUseMockService('openai')) {
        return this.createMockOpenAIClient();
      }
      
      const { OpenAI } = await import('openai');
      const config = environmentManager.getServiceConfig('openai');
      
      if (!config.apiKey) {
        throw new Error('OpenAI API key missing');
      }
      
      return new OpenAI({
        apiKey: config.apiKey,
        baseURL: config.endpoint || undefined,
        defaultQuery: { 'api-version': config.apiVersion || '2024-02-15-preview' },
        defaultHeaders: {
          'api-key': config.apiKey,
        },
        dangerouslyAllowBrowser: false, // Explicitly set for server environment
      });
    });
  }

  private createMockCosmosClient() {
    return {
      databases: {
        createIfNotExists: async () => ({
          database: {
            containers: {
              createIfNotExists: async () => ({
                container: {
                  items: {
                    create: async () => ({ item: {} }),
                    read: async () => ({ resource: null }),
                    replace: async () => ({ resource: {} }),
                    query: async () => ({ resources: [] }),
                  },
                },
              }),
            },
          },
        }),
      },
    };
  }

  private createMockRedisClient() {
    return {
      get: async () => null,
      set: async () => 'OK',
      setEx: async () => 'OK',
      del: async () => 0,
      disconnect: async () => {},
      on: () => {},
    };
  }

  private createMockOpenAIClient() {
    return {
      chat: {
        completions: {
          create: async () => ({
            choices: [{ message: { content: 'Mock response' } }],
          }),
        },
      },
      embeddings: {
        create: async () => ({
          data: [{ embedding: new Array(1536).fill(0.1) }],
        }),
      },
    };
  }

  async getService<T>(serviceName: string): Promise<T> {
    // Return cached service if available and healthy
    if (this.services.has(serviceName)) {
      const state = this.serviceStates.get(serviceName);
      if (state?.available) {
        return this.services.get(serviceName);
      }
    }

    // Initialize service if not exists or failed
    return this.initializeService<T>(serviceName);
  }

  private async initializeService<T>(serviceName: string): Promise<T> {
    const state = this.serviceStates.get(serviceName) || {
      initialized: false,
      available: false,
      retryCount: 0,
      maxRetries: 3,
    };

    // Check if we've exceeded retry limit
    if (state.retryCount >= state.maxRetries) {
      logger.warn(`Service ${serviceName} exceeded retry limit, using fallback`);
      return this.getFallbackService<T>(serviceName);
    }

    try {
      const initializer = this.initializers.get(serviceName);
      if (!initializer) {
        throw new Error(`No initializer found for service: ${serviceName}`);
      }

      const service = await initializer();
      
      // Update service state
      this.services.set(serviceName, service);
      this.serviceStates.set(serviceName, {
        ...state,
        initialized: true,
        available: true,
        retryCount: 0,
      });

      logger.info(`Service ${serviceName} initialized successfully`);
      return service as T;

    } catch (error) {
      logger.error(`Failed to initialize service ${serviceName}:`, error);
      
      // Update service state with error
      this.serviceStates.set(serviceName, {
        ...state,
        initialized: true,
        available: false,
        lastError: error as Error,
        retryCount: state.retryCount + 1,
      });

      // Return fallback service
      return this.getFallbackService<T>(serviceName);
    }
  }

  private getFallbackService<T>(serviceName: string): T {
    switch (serviceName) {
      case 'cosmos':
        return this.createMockCosmosClient() as T;
      case 'redis':
        return this.createMockRedisClient() as T;
      case 'openai':
        return this.createMockOpenAIClient() as T;
      default:
        throw new Error(`No fallback available for service: ${serviceName}`);
    }
  }

  // Health check for all services
  async healthCheck(): Promise<Record<string, boolean>> {
    const health: Record<string, boolean> = {};
    
    for (const [serviceName, state] of this.serviceStates.entries()) {
      health[serviceName] = state.available;
    }
    
    return health;
  }

  // Reset service state (useful for testing)
  resetService(serviceName: string): void {
    this.services.delete(serviceName);
    this.serviceStates.delete(serviceName);
  }

  // Reset all services
  resetAllServices(): void {
    this.services.clear();
    this.serviceStates.clear();
  }
}

// Singleton instance
export const serviceFactory = new ServiceFactory();

// Convenience functions
export async function getCosmosClient() {
  return serviceFactory.getService('cosmos');
}

export async function getRedisClient() {
  return serviceFactory.getService('redis');
}

export async function getOpenAIClient() {
  return serviceFactory.getService('openai');
}

export async function getServiceHealth() {
  return serviceFactory.healthCheck();
}
