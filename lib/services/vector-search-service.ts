/**
 * Vector Search Service
 * Simple implementation for semantic search functionality
 */

import { logger } from '@/lib/logger';

export interface SearchResult {
  content: string;
  source: string;
  score: number;
  metadata?: Record<string, any>;
}

export interface SemanticSearchResult {
  results: SearchResult[];
  query: string;
  totalResults: number;
  confidence: number;
  processingTime: number;
}

export class VectorSearchService {
  private documents: Array<{
    id: string;
    content: string;
    source: string;
    metadata: Record<string, any>;
  }> = [];

  constructor() {
    this.initializeDocuments();
  }

  private initializeDocuments() {
    // Initialize with some basic benefits documents
    this.documents = [
      {
        id: 'hsa-basics',
        content: 'Health Savings Account (HSA) is a tax-advantaged medical savings account available to taxpayers in the United States who are enrolled in a high-deductible health plan.',
        source: 'HSA Documentation',
        metadata: { category: 'hsa', type: 'basics' }
      },
      {
        id: 'hsa-contributions',
        content: 'HSA contribution limits for 2024: $4,300 for individual coverage, $8,600 for family coverage. Catch-up contributions of $1,000 for those 55 and older.',
        source: 'HSA Contribution Guidelines',
        metadata: { category: 'hsa', type: 'contributions' }
      },
      {
        id: 'medical-plans',
        content: 'Medical plans include PPO, HMO, and HSA-eligible high-deductible health plans. Coverage varies by plan type and includes preventive care, emergency services, and prescription drugs.',
        source: 'Medical Benefits Guide',
        metadata: { category: 'medical', type: 'plans' }
      },
      {
        id: 'dental-coverage',
        content: 'Dental coverage includes preventive care (cleanings, exams), basic services (fillings, extractions), and major services (crowns, bridges). Annual maximums and deductibles apply.',
        source: 'Dental Benefits Summary',
        metadata: { category: 'dental', type: 'coverage' }
      },
      {
        id: 'vision-benefits',
        content: 'Vision benefits cover annual eye exams, frames, lenses, and contact lenses. Some plans include LASIK surgery discounts and progressive lens upgrades.',
        source: 'Vision Benefits Overview',
        metadata: { category: 'vision', type: 'benefits' }
      }
    ];
  }

  async semanticSearch(query: string, limit: number = 5): Promise<SemanticSearchResult> {
    const startTime = Date.now();
    
    try {
      // Simple keyword-based search for now
      const queryLower = query.toLowerCase();
      const results: SearchResult[] = [];

      for (const doc of this.documents) {
        const contentLower = doc.content.toLowerCase();
        const sourceLower = doc.source.toLowerCase();
        
        // Calculate simple relevance score based on keyword matches
        let score = 0;
        const queryWords = queryLower.split(/\s+/);
        
        for (const word of queryWords) {
          if (word.length > 2) { // Ignore short words
            if (contentLower.includes(word)) score += 0.3;
            if (sourceLower.includes(word)) score += 0.2;
            if (doc.metadata.category?.toLowerCase().includes(word)) score += 0.1;
          }
        }

        if (score > 0) {
          results.push({
            content: doc.content,
            source: doc.source,
            score: Math.min(score, 1.0), // Cap at 1.0
            metadata: doc.metadata
          });
        }
      }

      // Sort by score and limit results
      results.sort((a, b) => b.score - a.score);
      const limitedResults = results.slice(0, limit);
      
      // Calculate overall confidence based on top result score
      const confidence = limitedResults.length > 0 ? limitedResults[0].score : 0;
      const processingTime = Date.now() - startTime;

      logger.info('Vector search completed', {
        query,
        resultsFound: limitedResults.length,
        totalDocuments: this.documents.length,
        confidence,
        processingTime
      });

      return {
        results: limitedResults,
        query,
        totalResults: limitedResults.length,
        confidence,
        processingTime
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('Vector search failed', { error, query, processingTime });
      return {
        results: [],
        query,
        totalResults: 0,
        confidence: 0,
        processingTime
      };
    }
  }

  async addDocument(content: string, source: string, metadata: Record<string, any> = {}): Promise<void> {
    const id = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.documents.push({
      id,
      content,
      source,
      metadata
    });
    
    logger.info('Document added to vector search', { id, source, contentLength: content.length });
  }

  async removeDocument(id: string): Promise<boolean> {
    const index = this.documents.findIndex(doc => doc.id === id);
    if (index !== -1) {
      this.documents.splice(index, 1);
      logger.info('Document removed from vector search', { id });
      return true;
    }
    return false;
  }

  getDocumentCount(): number {
    return this.documents.length;
  }
}
