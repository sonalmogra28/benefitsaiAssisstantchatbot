import { logger } from '@/lib/logger';
import { getClient } from '@/lib/azure/cosmos';

const isBuild = () => process.env.NEXT_PHASE === 'phase-production-build';

export interface DocumentSearchResult {
  id: string;
  title: string;
  content: string;
  relevanceScore: number;
  metadata: Record<string, any>;
}

class DocumentSearchService {
  private container: any = null;

  private async ensureInitialized() {
    if (isBuild()) return;
    if (this.container) return;
    
    const client = await getClient();
    if (!client) return;
    
    this.container = client.database('BenefitsDB').container('documents');
  }

  async searchDocuments(query: string, companyId: string, limit: number = 10): Promise<DocumentSearchResult[]> {
    await this.ensureInitialized();
    try {
      // Simple text search implementation
      const searchQuery = {
        query: `
          SELECT * FROM c 
          WHERE c.companyId = @companyId 
          AND (CONTAINS(LOWER(c.title), LOWER(@query)) OR CONTAINS(LOWER(c.content), LOWER(@query)))
          ORDER BY c.updatedAt DESC
        `,
        parameters: [
          { name: '@companyId', value: companyId },
          { name: '@query', value: query }
        ]
      };

      const { resources } = await this.container.items.query(searchQuery).fetchAll();

      return resources.slice(0, limit).map((doc: any) => ({
        id: doc.id,
        title: doc.title || 'Untitled',
        content: doc.content || '',
        relevanceScore: this.calculateRelevanceScore(query, doc),
        metadata: {
          type: doc.type,
          updatedAt: doc.updatedAt,
          author: doc.author
        }
      }));

    } catch (error) {
      logger.error({ error, query, companyId }, 'Document search failed');
      return [];
    }
  }

  private calculateRelevanceScore(query: string, document: any): number {
    const queryLower = query.toLowerCase();
    const title = (document.title || '').toLowerCase();
    const content = (document.content || '').toLowerCase();
    
    let score = 0;
    
    // Title matches are more relevant
    if (title.includes(queryLower)) score += 0.5;
    if (content.includes(queryLower)) score += 0.3;
    
    // Exact phrase matches
    if (title.includes(queryLower)) score += 0.2;
    
    return Math.min(score, 1.0);
  }
}

export const documentSearchService = new DocumentSearchService();
