/**
 * Simple RAG System - Streamlined for MVP
 * Basic document search without complex vector operations
 */

import { logger } from '@/lib/logger';

interface SimpleDocument {
  id: string;
  title: string;
  content: string;
  companyId: string;
  metadata: {
    type: string;
    uploadedAt: string;
  };
}

interface SimpleSearchResult {
  document: SimpleDocument;
  score: number;
  matchedText: string;
}

export class SimpleRAGSystem {
  private documents: SimpleDocument[] = [];

  constructor() {
    this.loadSampleDocuments();
  }

  private loadSampleDocuments() {
    // Load sample benefits documents
    this.documents = [
      {
        id: 'doc-1',
        title: 'Health Insurance Benefits Guide',
        content: 'Our health insurance plans provide comprehensive coverage including medical, dental, and vision benefits. The basic plan covers 80% of medical costs while the premium plan covers 90%.',
        companyId: 'default',
        metadata: {
          type: 'benefits',
          uploadedAt: new Date().toISOString()
        }
      },
      {
        id: 'doc-2',
        title: 'Dental Coverage Details',
        content: 'Dental coverage includes preventive care, basic procedures, and major work. Annual maximum is $1,500 for basic plan and $2,500 for premium plan.',
        companyId: 'default',
        metadata: {
          type: 'dental',
          uploadedAt: new Date().toISOString()
        }
      }
    ];
  }

  async searchDocuments(query: string, companyId: string = 'default'): Promise<SimpleSearchResult[]> {
    try {
      const lowerQuery = query.toLowerCase();
      const results: SimpleSearchResult[] = [];

      for (const doc of this.documents) {
        if (doc.companyId !== companyId) continue;

        const content = doc.content.toLowerCase();
        const title = doc.title.toLowerCase();
        
        // Simple text matching
        let score = 0;
        let matchedText = '';

        // Check title matches
        if (title.includes(lowerQuery)) {
          score += 0.8;
          matchedText = doc.title;
        }

        // Check content matches
        if (content.includes(lowerQuery)) {
          score += 0.6;
          const index = content.indexOf(lowerQuery);
          const start = Math.max(0, index - 50);
          const end = Math.min(content.length, index + 100);
          matchedText = doc.content.substring(start, end);
        }

        // Check for keyword matches
        const keywords = lowerQuery.split(' ');
        for (const keyword of keywords) {
          if (keyword.length > 2) {
            if (content.includes(keyword)) score += 0.2;
            if (title.includes(keyword)) score += 0.3;
          }
        }

        if (score > 0) {
          results.push({
            document: doc,
            score: Math.min(score, 1),
            matchedText: matchedText || doc.content.substring(0, 100)
          });
        }
      }

      // Sort by score and return top results
      return results
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

    } catch (error) {
      logger.error('Error in SimpleRAGSystem search', { error, query });
      return [];
    }
  }

  async addDocument(document: Omit<SimpleDocument, 'id'>): Promise<string> {
    const id = `doc-${Date.now()}`;
    const newDoc: SimpleDocument = {
      ...document,
      id
    };
    
    this.documents.push(newDoc);
    logger.info('Document added to simple RAG system', { id, title: document.title });
    
    return id;
  }

  async getDocument(id: string): Promise<SimpleDocument | null> {
    return this.documents.find(doc => doc.id === id) || null;
  }

  async deleteDocument(id: string): Promise<boolean> {
    const index = this.documents.findIndex(doc => doc.id === id);
    if (index !== -1) {
      this.documents.splice(index, 1);
      return true;
    }
    return false;
  }
}

// Export singleton instance
export const simpleRAGSystem = new SimpleRAGSystem();
