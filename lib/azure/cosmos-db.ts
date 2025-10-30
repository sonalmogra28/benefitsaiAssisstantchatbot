import { CosmosClient } from '@azure/cosmos';

const COSMOS_ENDPOINT = process.env.COSMOS_DB_ENDPOINT || '';
const COSMOS_KEY = process.env.COSMOS_DB_KEY || '';

if (!COSMOS_ENDPOINT || !COSMOS_KEY) {
  throw new Error('Azure Cosmos DB connection details are not configured.');
}

const cosmosClient = new CosmosClient({
  endpoint: COSMOS_ENDPOINT,
  key: COSMOS_KEY,
});

/**
 * Cosmos DB Service - Production-Ready Implementation
 * 
 * This module provides lazy initialization and graceful degradation
 * for Azure Cosmos DB connections, following enterprise best practices.
 */

import { getCosmosClient } from '@/lib/services/service-factory';
import { logger } from '@/lib/logger';
import { isBuildTime, getSafeService } from '@/lib/config/build-time';
>>>>>>> main

export const DATABASE_NAME = 'BenefitsChat';
export const CONVERSATIONS_CONTAINER = 'Conversations';
export const USERS_CONTAINER = 'Users';
export const DOCUMENTS_CONTAINER = 'Documents';

export async function getContainer(containerId: string) {
  const { database } = await cosmosClient.databases.createIfNotExists({
    id: DATABASE_NAME,
  });
  const { container } = await database.containers.createIfNotExists({
    id: containerId,
  });
  return container;
}

export default cosmosClient;
=======
// Cache for containers to avoid repeated initialization
const containerCache = new Map<string, any>();

export async function getContainer(containerId: string) {
  try {
    // Check cache first
    if (containerCache.has(containerId)) {
      return containerCache.get(containerId);
    }

    // During build time, return mock immediately
    if (isBuildTime) {
      const mockContainer = createMockContainer(containerId);
      containerCache.set(containerId, mockContainer);
      return mockContainer;
    }

    // Get Cosmos client (with fallback)
    const cosmosClient = await getCosmosClient() as any;
    
    // Create database and container
    const { database } = await cosmosClient.databases.createIfNotExists({
      id: DATABASE_NAME,
    });
    
    const { container } = await database.containers.createIfNotExists({
      id: containerId,
    });

    // Cache the container
    containerCache.set(containerId, container);
    
    logger.info(`Cosmos DB container '${containerId}' initialized successfully`);
    return container;

  } catch (error) {
    logger.error(`Failed to get Cosmos DB container '${containerId}':`, error);
    
    // Return a mock container for graceful degradation
    return createMockContainer(containerId);
  }
}

// Mock container for graceful degradation
function createMockContainer(containerId: string) {
  logger.warn(`Using mock container for '${containerId}' due to Cosmos DB unavailability`);
  
  return {
    id: containerId,
    items: {
      create: async (item: any) => {
        logger.debug(`Mock: Creating item in ${containerId}`, { itemId: item.id });
        return { item: { ...item, id: item.id || `mock_${Date.now()}` } };
      },
      read: async (id: string) => {
        logger.debug(`Mock: Reading item ${id} from ${containerId}`);
        return { resource: null };
      },
      replace: async (item: any) => {
        logger.debug(`Mock: Replacing item ${item.id} in ${containerId}`);
        return { resource: item };
      },
      query: async (query: any) => {
        logger.debug(`Mock: Querying ${containerId}`, { query });
        return { resources: [] };
      },
    },
  };
}

// Health check function
export async function checkCosmosHealth(): Promise<boolean> {
  try {
    const client = await getCosmosClient() as any;
    // Try to read database info
    await client.databases.read(DATABASE_NAME);
    return true;
  } catch (error) {
    logger.warn('Cosmos DB health check failed:', error);
    return false;
  }
}

// Clear container cache (useful for testing)
export function clearContainerCache(): void {
  containerCache.clear();
}
>>>>>>> main
