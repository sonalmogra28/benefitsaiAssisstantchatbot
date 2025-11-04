/**
 * Cosmos DB Data Validation Script
 * Verifies that real AmeriVet data is properly loaded and accessible
 */

import { getRepositories } from '@/lib/azure/cosmos';
import { logger } from '@/lib/logger';

interface ValidationResult {
  container: string;
  status: 'success' | 'warning' | 'error';
  count: number;
  sampleRecord?: any;
  issues: string[];
}

export async function validateCosmosData(): Promise<{
  success: boolean;
  results: ValidationResult[];
  summary: string;
}> {
  const results: ValidationResult[] = [];
  
  try {
    logger.info('Starting Cosmos DB data validation...');
    const repositories = await getRepositories();

    // Validate Users Container
    try {
      const users = await repositories.users.list();
      results.push({
        container: 'Users',
        status: users.length > 0 ? 'success' : 'warning',
        count: users.length,
        sampleRecord: users[0] ? { id: users[0].id, email: users[0].email } : null,
        issues: users.length === 0 ? ['No users found'] : [],
      });
    } catch (error) {
      results.push({
        container: 'Users',
        status: 'error',
        count: 0,
        issues: [`Failed to query: ${error}`],
      });
    }

    // Validate Companies Container
    try {
      const companies = await repositories.companies.list();
      results.push({
        container: 'Companies',
        status: companies.length > 0 ? 'success' : 'warning',
        count: companies.length,
        sampleRecord: companies[0] ? { id: companies[0].id, name: companies[0].name } : null,
        issues: companies.length === 0 ? ['No companies found'] : [],
      });
    } catch (error) {
      results.push({
        container: 'Companies',
        status: 'error',
        count: 0,
        issues: [`Failed to query: ${error}`],
      });
    }

    // Validate Benefits Container
    try {
      const benefits = await repositories.benefits.list();
      results.push({
        container: 'Benefits',
        status: benefits.length > 0 ? 'success' : 'warning',
        count: benefits.length,
        sampleRecord: benefits[0] ? { id: benefits[0].id, planName: benefits[0].planName } : null,
        issues: benefits.length === 0 ? ['No benefits found'] : [],
      });
    } catch (error) {
      results.push({
        container: 'Benefits',
        status: 'error',
        count: 0,
        issues: [`Failed to query: ${error}`],
      });
    }

    // Validate Documents Container
    try {
      const documents = await repositories.documents.list();
      results.push({
        container: 'Documents',
        status: documents.length > 0 ? 'success' : 'warning',
        count: documents.length,
        sampleRecord: documents[0] ? { id: documents[0].id, title: documents[0].title } : null,
        issues: documents.length === 0 ? ['No documents found'] : [],
      });
    } catch (error) {
      results.push({
        container: 'Documents',
        status: 'error',
        count: 0,
        issues: [`Failed to query: ${error}`],
      });
    }

    // Validate FAQs Container
    try {
      const faqs = await repositories.faqs.list();
      results.push({
        container: 'FAQs',
        status: faqs.length > 0 ? 'success' : 'warning',
        count: faqs.length,
        sampleRecord: faqs[0] ? { id: faqs[0].id, question: faqs[0].question?.substring(0, 50) } : null,
        issues: faqs.length === 0 ? ['No FAQs found'] : [],
      });
    } catch (error) {
      results.push({
        container: 'FAQs',
        status: 'error',
        count: 0,
        issues: [`Failed to query: ${error}`],
      });
    }

    // Validate Document Chunks Container (for RAG)
    try {
      const chunks = await repositories.documentChunks.list();
      results.push({
        container: 'DocumentChunks',
        status: chunks.length > 0 ? 'success' : 'warning',
        count: chunks.length,
        sampleRecord: chunks[0] ? { id: chunks[0].id, documentId: chunks[0].documentId } : null,
        issues: chunks.length === 0 ? ['No document chunks found - embeddings may not be generated'] : [],
      });
    } catch (error) {
      results.push({
        container: 'DocumentChunks',
        status: 'error',
        count: 0,
        issues: [`Failed to query: ${error}`],
      });
    }

    // Generate summary
    const successCount = results.filter(r => r.status === 'success').length;
    const warningCount = results.filter(r => r.status === 'warning').length;
    const errorCount = results.filter(r => r.status === 'error').length;
    const totalRecords = results.reduce((sum, r) => sum + r.count, 0);

    const summary = `
Cosmos DB Data Validation Report
=================================
Date: ${new Date().toISOString()}

Container Status:
- Success: ${successCount}/${results.length}
- Warnings: ${warningCount}/${results.length}
- Errors: ${errorCount}/${results.length}

Total Records: ${totalRecords}

Detailed Results:
${results.map(r => `
  ${r.container}:
    Status: ${r.status.toUpperCase()}
    Count: ${r.count}
    ${r.issues.length > 0 ? `Issues: ${r.issues.join(', ')}` : 'No issues'}
`).join('')}

Overall Status: ${errorCount === 0 ? (warningCount === 0 ? '✅ ALL SYSTEMS OPERATIONAL' : '⚠️ WARNINGS DETECTED') : '❌ ERRORS DETECTED'}
    `.trim();

    logger.info('Cosmos DB validation completed', {
      success: errorCount === 0,
      totalRecords,
      results,
    });

    return {
      success: errorCount === 0,
      results,
      summary,
    };

  } catch (error) {
    logger.error('Cosmos DB validation failed', error);
    return {
      success: false,
      results,
      summary: `Validation failed: ${error}`,
    };
  }
}

// CLI execution
if (require.main === module) {
  validateCosmosData()
    .then(result => {
      console.log(result.summary);
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Validation error:', error);
      process.exit(1);
    });
}
