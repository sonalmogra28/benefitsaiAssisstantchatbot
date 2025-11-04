/**
 * Embedding Validation Script
 * Verifies that embeddings are generated for uploaded documents
 * Run: npm run tsx scripts/validate-embeddings.ts
 */

import { getContainer } from '@/lib/azure/cosmos-db';
import { logger } from '@/lib/logger';

interface EmbeddingValidation {
  documentId: string;
  documentTitle: string;
  chunkCount: number;
  hasEmbeddings: boolean;
  embeddingDimensions?: number;
  issues: string[];
}

async function validateEmbeddings(): Promise<void> {
  try {
    console.log('🔍 Starting embedding validation...\n');

    // Get all documents
    const documentsContainer = await getContainer('Documents');
    const documentsQuery = {
      query: 'SELECT c.id, c.title, c.companyId FROM c WHERE c.companyId = @companyId',
      parameters: [{ name: '@companyId', value: 'amerivet' }],
    };
    const { resources: documents } = await documentsContainer.items
      .query(documentsQuery)
      .fetchAll();

    console.log(`📄 Found ${documents.length} AmeriVet documents\n`);

    if (documents.length === 0) {
      console.log('⚠️  No documents found for AmeriVet. Upload documents first.\n');
      return;
    }

    // Get all chunks
    const chunksContainer = await getContainer('DocumentChunks');
    const chunksQuery = {
      query: 'SELECT c.id, c.documentId, c.embedding FROM c WHERE c.companyId = @companyId',
      parameters: [{ name: '@companyId', value: 'amerivet' }],
    };
    const { resources: chunks } = await chunksContainer.items
      .query(chunksQuery)
      .fetchAll();

    console.log(`🧩 Found ${chunks.length} total document chunks\n`);

    // Validate each document
    const validations: EmbeddingValidation[] = [];

    for (const doc of documents) {
      const docChunks = chunks.filter((c: any) => c.documentId === doc.id);
      const hasEmbeddings = docChunks.some((c: any) => c.embedding && c.embedding.length > 0);
      const embeddingDimensions = docChunks.find((c: any) => c.embedding)?.embedding?.length;

      const issues: string[] = [];
      if (docChunks.length === 0) {
        issues.push('No chunks generated');
      }
      if (!hasEmbeddings) {
        issues.push('No embeddings found');
      }
      if (embeddingDimensions && embeddingDimensions !== 1536) {
        issues.push(`Unexpected embedding dimensions: ${embeddingDimensions} (expected 1536)`);
      }

      validations.push({
        documentId: doc.id,
        documentTitle: doc.title || 'Untitled',
        chunkCount: docChunks.length,
        hasEmbeddings,
        embeddingDimensions,
        issues,
      });
    }

    // Print results
    console.log('📊 Validation Results:\n');
    console.log('─'.repeat(80));

    let successCount = 0;
    let warningCount = 0;

    for (const validation of validations) {
      const status = validation.hasEmbeddings && validation.issues.length === 0 ? '✅' : '⚠️';
      
      if (status === '✅') successCount++;
      else warningCount++;

      console.log(`${status} ${validation.documentTitle}`);
      console.log(`   Document ID: ${validation.documentId}`);
      console.log(`   Chunks: ${validation.chunkCount}`);
      console.log(`   Embeddings: ${validation.hasEmbeddings ? 'Yes' : 'No'}`);
      if (validation.embeddingDimensions) {
        console.log(`   Dimensions: ${validation.embeddingDimensions}`);
      }
      if (validation.issues.length > 0) {
        console.log(`   Issues: ${validation.issues.join(', ')}`);
      }
      console.log('');
    }

    console.log('─'.repeat(80));
    console.log('\n📈 Summary:');
    console.log(`   Total Documents: ${documents.length}`);
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ⚠️  Warnings: ${warningCount}`);
    console.log(`   Total Chunks: ${chunks.length}`);
    console.log(`   Chunks with Embeddings: ${chunks.filter((c: any) => c.embedding && c.embedding.length > 0).length}`);

    if (warningCount > 0) {
      console.log('\n⚠️  Some documents are missing embeddings. Run the embedding generation process:');
      console.log('   npm run generate-embeddings');
    } else {
      console.log('\n✅ All documents have embeddings generated!');
    }

  } catch (error) {
    logger.error('Embedding validation failed', error);
    console.error('\n❌ Validation failed:', error);
    process.exit(1);
  }
}

// Run validation
validateEmbeddings()
  .then(() => {
    console.log('\n✅ Embedding validation completed\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
