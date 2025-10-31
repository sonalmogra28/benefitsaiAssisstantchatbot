/**
 * Hybrid Database Service - Azure Cosmos DB Integration
 * Simplified database operations for hybrid architecture
 */

import { CosmosClient, Database, Container } from '@azure/cosmos';
import { SimpleLogger } from './simple-logger';
import { getErrorCode, isErrorWithCode } from '../utils/error-handler';

const isBuild = () => process.env.NEXT_PHASE === 'phase-production-build';

export interface DatabaseItem {
  id: string;
  [key: string]: any;
}

export class HybridDatabaseService {
  private client: CosmosClient | null = null;
  private database: Database | null = null;
  private containers: Map<string, Container> = new Map();

  private async ensureInitialized() {
    if (isBuild()) return false;
    if (this.client && this.database) return true;

    const connectionString = process.env.AZURE_COSMOS_CONNECTION_STRING;
    if (!connectionString) {
      SimpleLogger.warn('AZURE_COSMOS_CONNECTION_STRING not available');
      return false;
    }

    this.client = new CosmosClient(connectionString);
    this.database = this.client.database('benefits-db');
    return true;
  }

  private async getContainer(containerName: string): Promise<Container | null> {
    const initialized = await this.ensureInitialized();
    if (!initialized || !this.database) return null;

    if (!this.containers.has(containerName)) {
      const container = this.database.container(containerName);
      this.containers.set(containerName, container);
    }
    return this.containers.get(containerName)!;
  }

  async createItem<T extends DatabaseItem>(
    containerName: string, 
    item: Omit<T, 'id'>
  ): Promise<T> {
    try {
      const container = await this.getContainer(containerName);
      if (!container) throw new Error('Database not available');
      
      const itemWithId = { ...item, id: crypto.randomUUID() } as T;
      
      const { resource } = await container.items.create(itemWithId);
      SimpleLogger.info('Item created', { containerName, id: itemWithId.id });
      
      return resource as T;
    } catch (error) {
      SimpleLogger.error('Failed to create item', error, { containerName, item });
      throw error;
    }
  }

  async getItem<T extends DatabaseItem>(
    containerName: string, 
    id: string, 
    partitionKey?: string
  ): Promise<T | null> {
    try {
      const container = await this.getContainer(containerName);
      if (!container) return null;
      
      const { resource } = await container.item(id, partitionKey).read();
      
      return resource as T || null;
    } catch (error) {
      if (isErrorWithCode(error) && getErrorCode(error) === 404) {
        return null;
      }
      SimpleLogger.error('Failed to get item', error, { containerName, id, partitionKey });
      throw error;
    }
  }

  async updateItem<T extends DatabaseItem>(
    containerName: string, 
    id: string, 
    updates: Partial<T>,
    partitionKey?: string
  ): Promise<T> {
    try {
      const container = await this.getContainer(containerName);
      if (!container) throw new Error('Database not available');
      
      const { resource } = await container.item(id, partitionKey).replace({
        ...updates,
        id,
        updatedAt: new Date().toISOString()
      });
      
      SimpleLogger.info('Item updated', { containerName, id });
      return resource as unknown as T;
    } catch (error) {
      SimpleLogger.error('Failed to update item', error, { containerName, id, updates });
      throw error;
    }
  }

  async deleteItem(
    containerName: string, 
    id: string, 
    partitionKey?: string
  ): Promise<void> {
    try {
      const container = await this.getContainer(containerName);
      if (!container) return;
      
      await container.item(id, partitionKey).delete();
      
      SimpleLogger.info('Item deleted', { containerName, id });
    } catch (error) {
      SimpleLogger.error('Failed to delete item', error, { containerName, id, partitionKey });
      throw error;
    }
  }

  async queryItems<T extends DatabaseItem>(
    containerName: string,
    query: string,
    parameters?: { name: string; value: any }[]
  ): Promise<T[]> {
    try {
      const container = await this.getContainer(containerName);
      if (!container) return [];
      
      const { resources: resources } = await container.items.query({
        query,
        parameters: parameters || []
      }).fetchAll();
      
      return resources as T[];
    } catch (error) {
      SimpleLogger.error('Failed to query items', error, { containerName, query, parameters });
      throw error;
    }
  }

  async getItemsByUserId<T extends DatabaseItem>(
    containerName: string,
    userId: string,
    limit = 50
  ): Promise<T[]> {
    return this.queryItems<T>(
      containerName,
      'SELECT * FROM c WHERE c.userId = @userId ORDER BY c.createdAt DESC',
      [{ name: '@userId', value: userId }]
    );
  }
}

export const hybridDatabase = new HybridDatabaseService();
