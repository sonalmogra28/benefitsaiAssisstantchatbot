// lib/services/vector-search.ts
import { ChromaClient } from 'chromadb';
import { OpenAI } from 'openai';
import { logger } from '@/lib/logger';

interface VectorSearchResult {
  content: string;
  score: number;
  metadata: any;
  source: string;
}

interface SemanticSearchResult {
  query: string;
  results: VectorSearchResult[];
  processingTime: number;
  confidence: number;
}

export class VectorSearchService {
  private chromaClient!: ChromaClient;
  private openai!: OpenAI;
  private collection: any;
  private isInitialized = false;

  constructor() {
    // Initialize services asynchronously
    this.initializeServices().catch(error => {
      logger.error('Failed to initialize vector search services', { error });
    });
  }

  private async initializeServices() {
    try {
      // Initialize ChromaDB
      this.chromaClient = new ChromaClient({
        path: process.env.CHROMA_URL || 'http://localhost:8000',
      });

      // Initialize OpenAI for embeddings
      const apiKey = process.env.OPENAI_API_KEY || process.env.AZURE_OPENAI_API_KEY;
      if (apiKey) {
        this.openai = new OpenAI({
          apiKey,
          baseURL: process.env.AZURE_OPENAI_ENDPOINT || undefined,
          defaultQuery: { 'api-version': process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview' },
          defaultHeaders: {
            'api-key': apiKey,
          },
        });
      }

      await this.initializeCollection();
      this.isInitialized = true;
      logger.info('Vector search service initialized');
    } catch (error) {
      logger.error('Failed to initialize vector search service', { error });
    }
  }

  private async initializeCollection() {
    try {
      // Create or get collection for benefits documents
      this.collection = await this.chromaClient.getOrCreateCollection({
        name: 'benefits_documents',
        metadata: { description: 'AmeriVet benefits documents and information' },
      });
    } catch (error) {
      logger.error('Failed to initialize ChromaDB collection', { error });
    }
  }

  async addDocument(content: string, metadata: any = {}): Promise<void> {
    try {
      if (!this.isInitialized || !this.openai) {
        logger.warn('Vector search not fully initialized, skipping document addition');
        return;
      }

      // Generate embedding
      const embedding = await this.generateEmbedding(content);
      
      // Add to collection
      await this.collection.add({
        ids: [metadata.id || `doc_${Date.now()}`],
        embeddings: [embedding],
        documents: [content],
        metadatas: [metadata],
      });

      logger.info('Document added to vector store', { id: metadata.id });
    } catch (error) {
      logger.error('Failed to add document to vector store', { error });
    }
  }

  async addMultipleDocuments(documents: Array<{ content: string; metadata: any }>): Promise<void> {
    try {
      if (!this.isInitialized || !this.openai) {
        logger.warn('Vector search not fully initialized, skipping document addition');
        return;
      }

      const ids: string[] = [];
      const embeddings: number[][] = [];
      const contents: string[] = [];
      const metadatas: any[] = [];

      for (const doc of documents) {
        const embedding = await this.generateEmbedding(doc.content);
        ids.push(doc.metadata.id || `doc_${Date.now()}_${Math.random()}`);
        embeddings.push(embedding);
        contents.push(doc.content);
        metadatas.push(doc.metadata);
      }

      await this.collection.add({
        ids,
        embeddings,
        documents: contents,
        metadatas,
      });

      logger.info(`Added ${documents.length} documents to vector store`);
    } catch (error) {
      logger.error('Failed to add multiple documents to vector store', { error });
    }
  }

  async semanticSearch(query: string, limit: number = 5): Promise<SemanticSearchResult> {
    const startTime = Date.now();
    
    try {
      if (!this.isInitialized || !this.openai) {
        return this.getFallbackSearchResult(query);
      }

      // Generate query embedding
      const queryEmbedding = await this.generateEmbedding(query);
      
      // Search in vector store
      const results = await this.collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults: limit,
        include: ['documents', 'metadatas', 'distances'],
      });

      const searchResults: VectorSearchResult[] = results.documents[0].map((doc: string, index: number) => ({
        content: doc,
        score: 1 - (results.distances[0][index] || 0), // Convert distance to similarity score
        metadata: results.metadatas[0][index] || {},
        source: results.metadatas[0][index]?.source || 'Unknown',
      }));

      const processingTime = Date.now() - startTime;
      const confidence = this.calculateSearchConfidence(searchResults);

      return {
        query,
        results: searchResults,
        processingTime,
        confidence,
      };
    } catch (error) {
      logger.error('Semantic search failed', { error });
      return this.getFallbackSearchResult(query);
    }
  }

  async hybridSearch(query: string, limit: number = 5): Promise<SemanticSearchResult> {
    try {
      // Combine semantic search with keyword search
      const semanticResults = await this.semanticSearch(query, limit);
      const keywordResults = await this.keywordSearch(query, limit);
      
      // Merge and deduplicate results
      const mergedResults = this.mergeSearchResults(semanticResults.results, keywordResults.results);
      
      return {
        query,
        results: mergedResults.slice(0, limit),
        processingTime: semanticResults.processingTime + keywordResults.processingTime,
        confidence: Math.max(semanticResults.confidence, keywordResults.confidence),
      };
    } catch (error) {
      logger.error('Hybrid search failed', { error });
      return this.getFallbackSearchResult(query);
    }
  }

  private async keywordSearch(query: string, limit: number): Promise<{ results: VectorSearchResult[]; processingTime: number; confidence: number }> {
    const startTime = Date.now();
    
    try {
      // Simple keyword matching (in a real system, you'd use Elasticsearch or similar)
      query.toLowerCase().split(' ').filter(word => word.length > 2);
      
      // This is a simplified implementation
      // In production, you'd query your document store with keyword matching
      const mockResults: VectorSearchResult[] = [
        {
          content: `Keyword match for: ${query}`,
          score: 0.7,
          metadata: { type: 'keyword_match' },
          source: 'keyword_search',
        },
      ];

      return {
        results: mockResults,
        processingTime: Date.now() - startTime,
        confidence: 0.6,
      };
    } catch (error) {
      logger.error('Keyword search failed', { error });
      return { results: [], processingTime: 0, confidence: 0 };
    }
  }

  private mergeSearchResults(semanticResults: VectorSearchResult[], keywordResults: VectorSearchResult[]): VectorSearchResult[] {
    const merged = new Map<string, VectorSearchResult>();
    
    // Add semantic results
    semanticResults.forEach(result => {
      const key = result.content.substring(0, 100); // Use first 100 chars as key
      merged.set(key, result);
    });
    
    // Add keyword results (avoid duplicates)
    keywordResults.forEach(result => {
      const key = result.content.substring(0, 100);
      if (!merged.has(key)) {
        merged.set(key, result);
      } else {
        // Boost score if both semantic and keyword match
        const existing = merged.get(key)!;
        existing.score = Math.min(1.0, existing.score + 0.1);
      }
    });
    
    return Array.from(merged.values()).sort((a, b) => b.score - a.score);
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text,
      });
      return response.data[0].embedding;
    } catch (error) {
      logger.error('Failed to generate embedding', { error });
      // Return zero vector as fallback
      return new Array(1536).fill(0);
    }
  }

  private calculateSearchConfidence(results: VectorSearchResult[]): number {
    if (results.length === 0) return 0;
    
    const avgScore = results.reduce((sum, result) => sum + result.score, 0) / results.length;
    const hasHighScore = results.some(result => result.score > 0.8);
    
    return hasHighScore ? Math.min(1.0, avgScore + 0.2) : avgScore;
  }

  private getFallbackSearchResult(query: string): SemanticSearchResult {
    return {
      query,
      results: [
        {
          content: `I understand you're looking for information about: ${query}. While I can't perform advanced vector search right now, I can help you with general benefits information.`,
          score: 0.5,
          metadata: { type: 'fallback' },
          source: 'fallback_search',
        },
      ],
      processingTime: 50,
      confidence: 0.5,
    };
  }

  // Document similarity methods
  async findSimilarDocuments(content: string, limit: number = 3): Promise<VectorSearchResult[]> {
    const searchResult = await this.semanticSearch(content, limit);
    return searchResult.results;
  }

  async getDocumentRecommendations(userQuery: string, documentType: string): Promise<VectorSearchResult[]> {
    const enhancedQuery = `${userQuery} ${documentType} benefits information`;
    const searchResult = await this.semanticSearch(enhancedQuery, 5);
    return searchResult.results;
  }

  // Analytics methods
  async getSearchAnalytics(): Promise<any> {
    try {
      if (!this.isInitialized) {
        return { totalDocuments: 0, lastUpdated: null };
      }

      const collectionInfo = await this.collection.count();
      return {
        totalDocuments: collectionInfo,
        lastUpdated: new Date().toISOString(),
        status: 'active',
      };
    } catch (error) {
      logger.error('Failed to get search analytics', { error });
      return { totalDocuments: 0, lastUpdated: null, status: 'error' };
    }
  }
}

export const vectorSearchService = new VectorSearchService();
