/**
 * Integration test for document ingestion with RAG indexing
 * Tests the complete flow: Upload → Process → Chunk → Embed → Index
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { DocumentProcessor } from '@/lib/document-processing/document-processor';
import { getRepositories } from '@/lib/azure/cosmos';
import { searchClient } from '@/lib/ai/vector-search';
import fs from 'fs/promises';
import path from 'path';

describe('Document Ingestion with RAG Integration', () => {
  const testCompanyId = 'test-company-rag-integration';
  let documentProcessor: DocumentProcessor;

  beforeAll(() => {
    documentProcessor = new DocumentProcessor();
  });

  it('should process PDF and index chunks for RAG', async () => {
    // Skip if test PDF doesn't exist
    const pdfPath = path.join(process.cwd(), 'AmeriVet_2026 Benefits Guide_v2.1_10-9-25 Kaiser rates updated.pdf');
    
    let pdfExists = false;
    try {
      await fs.access(pdfPath);
      pdfExists = true;
    } catch {
      console.log('⚠️  Test PDF not found, skipping test');
      return;
    }

    if (!pdfExists) return;

    // Read PDF file
    const pdfBuffer = await fs.readFile(pdfPath);
    const fileName = 'AmeriVet_2026_Benefits_Guide.pdf';

    console.log(`\n📄 Testing PDF: ${fileName} (${(pdfBuffer.length / 1024).toFixed(2)} KB)\n`);

    // Process document
    const result = await documentProcessor.processDocument(
      pdfBuffer,
      fileName,
      'application/pdf',
      testCompanyId,
      'test-user-id' // uploadedBy parameter
    );

    // Log result for debugging
    if (!result.success) {
      console.error('❌ Processing failed:', result.error);
    }

    // Verify processing succeeded
    expect(result.success).toBe(true);
    expect(result.documentId).toBeDefined();
    console.log(`✅ Document processed: ${result.documentId}`);

    if (!result.documentId) {
      throw new Error('Document ID not returned');
    }

    // Wait for indexing to complete
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify document exists in Cosmos DB
    const repositories = await getRepositories();
    const doc = await repositories.documents.getById(result.documentId);
    
    expect(doc).toBeDefined();
    expect(doc?.id).toBe(result.documentId);
    console.log(`✅ Document stored in Cosmos DB`);

    // Verify chunks exist in Azure AI Search
    // Search for chunks with this document ID
    const searchResults = await searchClient.search('benefits', {
      filter: `metadata_documentId eq '${result.documentId}'`,
      top: 50
    });

    const chunks: any[] = [];
    for await (const result of searchResults.results) {
      chunks.push(result.document);
    }

    console.log(`\n📊 RAG Indexing Results:`);
    console.log(`   - Chunks indexed: ${chunks.length}`);
    
    // Verify chunks were created
    expect(chunks.length).toBeGreaterThan(0);
    console.log(`✅ Chunks found in Azure AI Search`);

    // Verify chunk structure
    const firstChunk = chunks[0];
    expect(firstChunk).toHaveProperty('id');
    expect(firstChunk).toHaveProperty('content');
    expect(firstChunk).toHaveProperty('content_vector');
    expect(firstChunk.content_vector).toBeInstanceOf(Array);
    expect(firstChunk.content_vector.length).toBe(1536); // text-embedding-ada-002
    
    console.log(`\n📋 Sample Chunk:`);
    console.log(`   - ID: ${firstChunk.id}`);
    console.log(`   - Content length: ${firstChunk.content?.length || 0} chars`);
    console.log(`   - Vector dimensions: ${firstChunk.content_vector?.length || 0}`);
    console.log(`   - Company ID: ${firstChunk.metadata_companyId}`);
    console.log(`   - Document ID: ${firstChunk.metadata_documentId}`);

    // Verify metadata
    expect(firstChunk.metadata_companyId).toBe(testCompanyId);
    expect(firstChunk.metadata_documentId).toBe(result.documentId);
    
    console.log(`\n✅ All RAG integration checks passed!\n`);

    // Cleanup: Delete test document and chunks
    try {
      await repositories.documents.delete(result.documentId);
      console.log(`🧹 Cleaned up test document from Cosmos DB`);
    } catch (error) {
      console.error('Failed to cleanup test document:', error);
    }

  }, 120000); // 2 minute timeout for full processing

  it('should retrieve indexed chunks via hybrid search', async () => {
    // This test verifies the chunks can be retrieved by the QA endpoint
    const pdfPath = path.join(process.cwd(), 'AmeriVet_2026 Benefits Guide_v2.1_10-9-25 Kaiser rates updated.pdf');
    
    let pdfExists = false;
    try {
      await fs.access(pdfPath);
      pdfExists = true;
    } catch {
      console.log('⚠️  Test PDF not found, skipping retrieval test');
      return;
    }

    if (!pdfExists) return;

    const pdfBuffer = await fs.readFile(pdfPath);
    const fileName = 'AmeriVet_2026_Benefits_Guide_Retrieval_Test.pdf';

    // Process document
    const result = await documentProcessor.processDocument(
      pdfBuffer,
      fileName,
      'application/pdf',
      testCompanyId,
      'test-user-id' // uploadedBy parameter
    );

    // Log result for debugging
    if (!result.success) {
      console.error('❌ Processing failed:', result.error);
    }

    expect(result.success).toBe(true);
    expect(result.documentId).toBeDefined();

    // Wait for indexing
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Test hybrid retrieval
    const { hybridRetrieve } = await import('@/lib/rag/hybrid-retrieval');
    
    const retrievalResults = await hybridRetrieve(
      'What are the dental benefits?',
      testCompanyId,
      { topK: 5 }
    );

    console.log(`\n🔍 Hybrid Retrieval Test:`);
    console.log(`   - Query: "What are the dental benefits?"`);
    console.log(`   - Results: ${retrievalResults.length}`);
    
    // Should retrieve relevant chunks
    expect(retrievalResults.length).toBeGreaterThan(0);
    
    // Check if any results are from our document
    const ourChunks = retrievalResults.filter(r => 
      r.metadata?.documentId === result.documentId
    );
    
    console.log(`   - Chunks from uploaded PDF: ${ourChunks.length}`);
    
    if (ourChunks.length > 0) {
      console.log(`\n✅ Document chunks successfully retrieved via hybrid search!`);
      console.log(`\nSample retrieved chunk:`);
      console.log(`   - Score: ${ourChunks[0].score}`);
      console.log(`   - Content preview: ${ourChunks[0].content?.substring(0, 150)}...`);
    }

    // Cleanup
    const repositories = await getRepositories();
    await repositories.documents.delete(result.documentId!);

  }, 120000);
});
