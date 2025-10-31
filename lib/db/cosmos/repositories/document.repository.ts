/**
 * Document Repository
 * 
 * Manages benefit plan documents with versioning and rollback capabilities
 * Implements document version control following best practices
 */

import { CosmosContainers } from '../client';
import { BaseRepository } from './base.repository';
import { DocumentDocument, VersionHistory } from '../types';

export class DocumentRepository extends BaseRepository<DocumentDocument> {
  constructor() {
    super(CosmosContainers.documents);
  }

  /**
   * Create new document with initial version
   * 
   * @param document - Document data (without version info)
   * @param userId - User creating the document
   * @param companyId - Company partition key
   */
  async createDocument(
    document: Omit<DocumentDocument, 'id' | 'version' | 'createdAt' | 'updatedAt'>,
    userId: string,
    companyId: string
  ): Promise<DocumentDocument> {
    const now = new Date().toISOString();

    const versionedDocument: Omit<DocumentDocument, 'id'> = {
      ...document,
      companyId,
      version: {
        current: 1,
        history: [
          {
            version: 1,
            timestamp: now,
            userId,
            changes: 'Initial document creation',
            snapshot: document.content, // Store full content snapshot
          },
        ],
      },
      createdAt: now,
      updatedAt: now,
    };

    return await this.create(versionedDocument);
  }

  /**
   * Update document with version increment
   * 
   * @param id - Document ID
   * @param updates - Updated fields
   * @param userId - User making the update
   * @param changes - Description of changes
   * @param companyId - Company partition key
   */
  async updateDocument(
    id: string,
    updates: Partial<Omit<DocumentDocument, 'id' | 'version' | 'companyId'>>,
    userId: string,
    changes: string,
    companyId: string
  ): Promise<DocumentDocument> {
    const existing = await this.findById(id, companyId);
    if (!existing) {
      throw new Error(`Document ${id} not found`);
    }

    const now = new Date().toISOString();
    const newVersion = existing.version.current + 1;

    // Create version history entry
    const historyEntry: VersionHistory = {
      version: newVersion,
      timestamp: now,
      userId,
      changes,
      snapshot: updates.content || existing.content, // Store content snapshot
    };

    const updatedDocument: Partial<DocumentDocument> = {
      ...updates,
      version: {
        current: newVersion,
        history: [...existing.version.history, historyEntry],
      },
      updatedAt: now,
    };

    return await this.update(id, updatedDocument, companyId, existing._etag);
  }

  /**
   * Get document version history
   * 
   * @param id - Document ID
   * @param companyId - Company partition key
   */
  async getVersionHistory(id: string, companyId: string): Promise<VersionHistory[]> {
    const document = await this.findById(id, companyId);
    if (!document) {
      throw new Error(`Document ${id} not found`);
    }

    return document.version.history;
  }

  /**
   * Rollback document to previous version
   * 
   * @param id - Document ID
   * @param targetVersion - Version number to rollback to
   * @param userId - User performing rollback
   * @param companyId - Company partition key
   */
  async rollbackToVersion(
    id: string,
    targetVersion: number,
    userId: string,
    companyId: string
  ): Promise<DocumentDocument> {
    const document = await this.findById(id, companyId);
    if (!document) {
      throw new Error(`Document ${id} not found`);
    }

    // Find target version in history
    const targetHistory = document.version.history.find((h) => h.version === targetVersion);
    if (!targetHistory) {
      throw new Error(`Version ${targetVersion} not found in document history`);
    }

    if (!targetHistory.snapshot) {
      throw new Error(`Version ${targetVersion} has no snapshot available`);
    }

    const now = new Date().toISOString();
    const newVersion = document.version.current + 1;

    // Create rollback history entry
    const rollbackEntry: VersionHistory = {
      version: newVersion,
      timestamp: now,
      userId,
      changes: `Rollback to version ${targetVersion}`,
      snapshot: targetHistory.snapshot,
    };

    const rolledBackDocument: Partial<DocumentDocument> = {
      content: targetHistory.snapshot,
      version: {
        current: newVersion,
        history: [...document.version.history, rollbackEntry],
      },
      updatedAt: now,
    };

    return await this.update(id, rolledBackDocument, companyId, document._etag);
  }

  /**
   * Get documents by company with pagination
   * 
   * @param companyId - Company partition key
   * @param maxItems - Max items per page
   * @param continuationToken - Pagination token
   */
  async getDocumentsByCompany(
    companyId: string,
    maxItems: number = 20,
    continuationToken?: string
  ) {
    const query = {
      query: 'SELECT * FROM c WHERE c.companyId = @companyId ORDER BY c.updatedAt DESC',
      parameters: [{ name: '@companyId', value: companyId }],
    };

    return await this.query(query, {
      maxItems,
      continuationToken,
      partitionKey: companyId,
    });
  }

  /**
   * Search documents by type
   * 
   * @param companyId - Company partition key
   * @param type - Document type filter
   */
  async getDocumentsByType(
    companyId: string,
    type: 'policy' | 'benefit_plan' | 'faq' | 'guide'
  ): Promise<DocumentDocument[]> {
    const query = {
      query: 'SELECT * FROM c WHERE c.companyId = @companyId AND c.type = @type ORDER BY c.updatedAt DESC',
      parameters: [
        { name: '@companyId', value: companyId },
        { name: '@type', value: type },
      ],
    };

    return await this.queryAll(query, companyId);
  }

  /**
   * Get documents pending processing
   * 
   * @param companyId - Company partition key
   */
  async getPendingDocuments(companyId: string): Promise<DocumentDocument[]> {
    const query = {
      query: 'SELECT * FROM c WHERE c.companyId = @companyId AND c.processingStatus IN ("pending", "processing")',
      parameters: [{ name: '@companyId', value: companyId }],
    };

    return await this.queryAll(query, companyId);
  }
}

// Singleton instance export
export const documentRepository = new DocumentRepository();
