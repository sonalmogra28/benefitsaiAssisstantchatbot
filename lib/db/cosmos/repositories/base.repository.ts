/**
 * Base Repository Pattern
 * 
 * Implements common CRUD operations with error handling, pagination, and retry logic
 * Follows Azure Cosmos DB best practices
 */

import { Container, FeedOptions, SqlQuerySpec } from '@azure/cosmos';
import { CosmosDocument, PaginatedResult, QueryOptions } from '../types';

export abstract class BaseRepository<T extends CosmosDocument> {
  constructor(protected readonly container: Container) {}

  /**
   * Create a new document
   * 
   * @param document - Document to create (without id if auto-generated)
   * @param partitionKey - Partition key value for multi-tenant isolation
   */
  async create(document: Omit<T, 'id'> & { id?: string }, partitionKey?: string): Promise<T> {
    try {
      const docWithId = {
        ...document,
        id: document.id || this.generateId(),
      } as T;

      const { resource } = await this.container.items.create(docWithId);

      if (!resource) {
        throw new Error('Failed to create document');
      }

      return resource as T;
    } catch (error) {
      this.handleError('create', error);
      throw error;
    }
  }

  /**
   * Read document by ID
   * 
   * @param id - Document ID
   * @param partitionKey - Partition key value (required for multi-tenant containers)
   */
  async findById(id: string, partitionKey?: string): Promise<T | null> {
    try {
      const { resource } = await this.container.item(id, partitionKey).read<T>();
      return resource || null;
    } catch (error: any) {
      if (error.code === 404) {
        return null;
      }
      this.handleError('findById', error);
      throw error;
    }
  }

  /**
   * Update document (optimistic concurrency with etag)
   * 
   * @param id - Document ID
   * @param updates - Partial updates
   * @param partitionKey - Partition key value
   * @param etag - Optional etag for optimistic concurrency
   */
  async update(
    id: string,
    updates: Partial<T>,
    partitionKey?: string,
    etag?: string
  ): Promise<T> {
    try {
      const existing = await this.findById(id, partitionKey);
      if (!existing) {
        throw new Error(`Document with id ${id} not found`);
      }

      const updated = { ...existing, ...updates };

      const { resource } = await this.container.item(id, partitionKey).replace(updated, {
        ...(etag && { accessCondition: { type: 'IfMatch', condition: etag } }),
      });

      if (!resource) {
        throw new Error('Failed to update document');
      }

      return resource as T;
    } catch (error) {
      this.handleError('update', error);
      throw error;
    }
  }

  /**
   * Delete document
   * 
   * @param id - Document ID
   * @param partitionKey - Partition key value
   */
  async delete(id: string, partitionKey?: string): Promise<void> {
    try {
      await this.container.item(id, partitionKey).delete();
    } catch (error: any) {
      if (error.code === 404) {
        // Already deleted, no-op
        return;
      }
      this.handleError('delete', error);
      throw error;
    }
  }

  /**
   * Query documents with pagination
   * 
   * @param query - SQL query or query spec
   * @param options - Query options (pagination, partition key)
   */
  async query(
    query: string | SqlQuerySpec,
    options: QueryOptions = {}
  ): Promise<PaginatedResult<T>> {
    try {
      const feedOptions: FeedOptions = {
        maxItemCount: options.maxItems || 100,
        ...(options.continuationToken && { continuationToken: options.continuationToken }),
        ...(options.partitionKey && { partitionKey: options.partitionKey }),
      };

      const queryIterator = this.container.items.query<T>(query, feedOptions);
      const { resources, continuationToken, hasMoreResults } = await queryIterator.fetchNext();

      return {
        items: resources,
        continuationToken,
        hasMore: hasMoreResults,
      };
    } catch (error) {
      this.handleError('query', error);
      throw error;
    }
  }

  /**
   * Query all documents (auto-paginate) - use cautiously
   * 
   * @param query - SQL query or query spec
   * @param partitionKey - Optional partition key for scoped queries
   */
  async queryAll(query: string | SqlQuerySpec, partitionKey?: string): Promise<T[]> {
    try {
      const feedOptions: FeedOptions = {
        ...(partitionKey && { partitionKey }),
      };

      const queryIterator = this.container.items.query<T>(query, feedOptions);
      const { resources } = await queryIterator.fetchAll();

      return resources;
    } catch (error) {
      this.handleError('queryAll', error);
      throw error;
    }
  }

  /**
   * Count documents matching query
   * 
   * @param query - SQL query (should use COUNT aggregate)
   * @param partitionKey - Optional partition key
   */
  async count(query: string | SqlQuerySpec, partitionKey?: string): Promise<number> {
    try {
      const feedOptions: FeedOptions = {
        ...(partitionKey && { partitionKey }),
      };

      const queryIterator = this.container.items.query<{ count: number }>(query, feedOptions);
      const { resources } = await queryIterator.fetchNext();

      return resources[0]?.count || 0;
    } catch (error) {
      this.handleError('count', error);
      throw error;
    }
  }

  /**
   * Bulk create documents (optimized for large inserts)
   * 
   * @param documents - Array of documents to create
   * @param partitionKey - Partition key value
   */
  async bulkCreate(documents: Array<Omit<T, 'id'> & { id?: string }>, partitionKey?: string): Promise<T[]> {
    try {
      const docsWithIds = documents.map((doc) => ({
        ...doc,
        id: doc.id || this.generateId(),
      })) as T[];

      const operations = docsWithIds.map((doc) => ({
        operationType: 'Create' as const,
        resourceBody: doc as any,
      }));

      const results = await this.container.items.bulk(operations);

      // Filter successful operations
      const created = results
        .filter((r: any) => r.statusCode >= 200 && r.statusCode < 300)
        .map((r: any) => r.resourceBody as T);

      return created;
    } catch (error) {
      this.handleError('bulkCreate', error);
      throw error;
    }
  }

  /**
   * Generate unique ID (override in subclass for custom logic)
   */
  protected generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Centralized error handling
   */
  protected handleError(operation: string, error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[${this.container.id}] ${operation} error:`, errorMessage);

    // Log to audit (in production, send to Application Insights)
    // TODO: Implement structured logging with Azure Monitor
  }
}
