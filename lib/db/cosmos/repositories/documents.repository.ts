/**
 * Documents Repository
 * Domain-specific operations for benefit documents with versioning
 * 
 * Best Practices:
 * - Repository pattern for data access abstraction
 * - Version control for document history
 * - Type-safe operations
 * - Business logic encapsulation
 * - Audit trail integration
 */

import { CosmosContainers } from '../client';
import { CosmosOperations, buildQuery, PaginatedResult } from '../operations';
import { v4 as uuidv4 } from 'uuid';

/**
 * Document interface matching Cosmos schema
 */
export interface BenefitDocument {
  id: string;
  companyId: string;
  title: string;
  content: string;
  contentType: 'html' | 'markdown' | 'pdf' | 'docx';
  category: 'medical' | 'dental' | 'vision' | '401k' | 'pto' | 'other';
  tags: string[];
  version: {
    current: number;
    history: VersionHistory[];
  };
  metadata: {
    fileSize?: number;
    mimeType?: string;
    originalFilename?: string;
  };
  embedding?: number[];
  vectorId?: string;
  uploadedBy: string;
  uploadedAt: string;
  lastModifiedBy: string;
  lastModifiedAt: string;
  status: 'draft' | 'published' | 'archived';
  _etag?: string;
  _ts?: number;
}

export interface VersionHistory {
  version: number;
  modifiedBy: string;
  modifiedAt: string;
  changes: string;
  contentSnapshot?: string;
}

/**
 * Document creation input
 */
export interface CreateDocumentInput {
  companyId: string;
  title: string;
  content: string;
  contentType: 'html' | 'markdown' | 'pdf' | 'docx';
  category: BenefitDocument['category'];
  tags?: string[];
  metadata?: BenefitDocument['metadata'];
  uploadedBy: string;
  status?: 'draft' | 'published';
}

/**
 * Document update input
 */
export interface UpdateDocumentInput {
  title?: string;
  content?: string;
  category?: BenefitDocument['category'];
  tags?: string[];
  status?: 'draft' | 'published' | 'archived';
  modifiedBy: string;
  changes: string;
}

/**
 * Documents Repository
 */
export class DocumentsRepository {
  private static container = CosmosContainers.documents;

  /**
   * Create a new document with version 1
   */
  static async createDocument(input: CreateDocumentInput): Promise<BenefitDocument> {
    const now = new Date().toISOString();
    const document: BenefitDocument = {
      id: uuidv4(),
      companyId: input.companyId,
      title: input.title,
      content: input.content,
      contentType: input.contentType,
      category: input.category,
      tags: input.tags || [],
      version: {
        current: 1,
        history: [
          {
            version: 1,
            modifiedBy: input.uploadedBy,
            modifiedAt: now,
            changes: 'Initial document creation',
          },
        ],
      },
      metadata: input.metadata || {},
      uploadedBy: input.uploadedBy,
      uploadedAt: now,
      lastModifiedBy: input.uploadedBy,
      lastModifiedAt: now,
      status: input.status || 'draft',
    };

    return await CosmosOperations.create(
      this.container,
      document,
      input.companyId
    );
  }

  /**
   * Get document by ID
   */
  static async getDocument(
    id: string,
    companyId: string
  ): Promise<BenefitDocument | null> {
    return await CosmosOperations.read<BenefitDocument>(
      this.container,
      id,
      companyId
    );
  }

  /**
   * Update document with automatic versioning
   */
  static async updateDocument(
    id: string,
    companyId: string,
    input: UpdateDocumentInput,
    etag?: string
  ): Promise<BenefitDocument> {
    // Get current document
    const current = await this.getDocument(id, companyId);
    if (!current) {
      throw new Error('Document not found');
    }

    const now = new Date().toISOString();
    const newVersion = current.version.current + 1;

    // Create version history entry
    const historyEntry: VersionHistory = {
      version: newVersion,
      modifiedBy: input.modifiedBy,
      modifiedAt: now,
      changes: input.changes,
      // Store previous content for rollback capability
      contentSnapshot: input.content ? current.content : undefined,
    };

    // Update document
    const updated: Partial<BenefitDocument> = {
      ...current,
      ...(input.title && { title: input.title }),
      ...(input.content && { content: input.content }),
      ...(input.category && { category: input.category }),
      ...(input.tags && { tags: input.tags }),
      ...(input.status && { status: input.status }),
      version: {
        current: newVersion,
        history: [...current.version.history, historyEntry],
      },
      lastModifiedBy: input.modifiedBy,
      lastModifiedAt: now,
    };

    return await CosmosOperations.update(
      this.container,
      id,
      companyId,
      updated,
      etag
    );
  }

  /**
   * Get all documents for a company with pagination
   */
  static async getCompanyDocuments(
    companyId: string,
    options: {
      status?: BenefitDocument['status'];
      category?: BenefitDocument['category'];
      maxItemCount?: number;
      continuationToken?: string;
    } = {}
  ): Promise<PaginatedResult<BenefitDocument>> {
    let query = 'SELECT * FROM c WHERE c.companyId = @companyId';
    const parameters: Record<string, any> = { companyId };

    if (options.status) {
      query += ' AND c.status = @status';
      parameters.status = options.status;
    }

    if (options.category) {
      query += ' AND c.category = @category';
      parameters.category = options.category;
    }

    query += ' ORDER BY c.lastModifiedAt DESC';

    return await CosmosOperations.query<BenefitDocument>(
      this.container,
      buildQuery(query, parameters),
      {
        maxItemCount: options.maxItemCount,
        continuationToken: options.continuationToken,
        partitionKey: companyId,
      }
    );
  }

  /**
   * Search documents by tags
   */
  static async searchByTags(
    companyId: string,
    tags: string[]
  ): Promise<BenefitDocument[]> {
    const query = `
      SELECT * FROM c 
      WHERE c.companyId = @companyId 
      AND ARRAY_LENGTH(SetIntersect(c.tags, @tags)) > 0
      AND c.status = 'published'
      ORDER BY c.lastModifiedAt DESC
    `;

    const result = await CosmosOperations.query<BenefitDocument>(
      this.container,
      buildQuery(query, { companyId, tags }),
      { partitionKey: companyId, maxItemCount: 100 }
    );

    return result.items;
  }

  /**
   * Get document version history
   */
  static async getVersionHistory(
    id: string,
    companyId: string
  ): Promise<VersionHistory[]> {
    const doc = await this.getDocument(id, companyId);
    return doc?.version.history || [];
  }

  /**
   * Rollback to a previous version
   */
  static async rollbackToVersion(
    id: string,
    companyId: string,
    targetVersion: number,
    modifiedBy: string
  ): Promise<BenefitDocument> {
    const doc = await this.getDocument(id, companyId);
    if (!doc) {
      throw new Error('Document not found');
    }

    const versionEntry = doc.version.history.find((v) => v.version === targetVersion);
    if (!versionEntry || !versionEntry.contentSnapshot) {
      throw new Error('Version not found or no content snapshot available');
    }

    return await this.updateDocument(id, companyId, {
      content: versionEntry.contentSnapshot,
      modifiedBy,
      changes: `Rolled back to version ${targetVersion}`,
    });
  }

  /**
   * Delete document (soft delete by archiving)
   */
  static async deleteDocument(
    id: string,
    companyId: string,
    modifiedBy: string
  ): Promise<void> {
    await this.updateDocument(id, companyId, {
      status: 'archived',
      modifiedBy,
      changes: 'Document archived',
    });
  }

  /**
   * Hard delete document (permanent)
   */
  static async permanentDelete(
    id: string,
    companyId: string
  ): Promise<void> {
    await CosmosOperations.delete(this.container, id, companyId);
  }

  /**
   * Get documents by category with counts
   */
  static async getDocumentStats(companyId: string): Promise<{
    total: number;
    byCategory: Record<string, number>;
    byStatus: Record<string, number>;
  }> {
    const query = buildQuery(
      'SELECT * FROM c WHERE c.companyId = @companyId',
      { companyId }
    );

    const result = await CosmosOperations.query<BenefitDocument>(
      this.container,
      query,
      { partitionKey: companyId, maxItemCount: 1000 }
    );

    const stats = {
      total: result.items.length,
      byCategory: {} as Record<string, number>,
      byStatus: {} as Record<string, number>,
    };

    result.items.forEach((doc) => {
      stats.byCategory[doc.category] = (stats.byCategory[doc.category] || 0) + 1;
      stats.byStatus[doc.status] = (stats.byStatus[doc.status] || 0) + 1;
    });

    return stats;
  }
}
