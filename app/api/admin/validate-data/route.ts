/**
 * Data Validation API Endpoint
 * GET /api/admin/validate-data
 * Validates that real AmeriVet data is loaded and accessible in Cosmos DB
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCompanyAdmin } from '@/lib/auth/unified-auth';
import { getContainer } from '@/lib/azure/cosmos-db';
import { logger } from '@/lib/logger';

interface ValidationResult {
  container: string;
  status: 'success' | 'warning' | 'error';
  count: number;
  sampleId?: string;
  issues: string[];
}

async function validateContainer(
  containerName: string,
  companyId: string = 'amerivet'
): Promise<ValidationResult> {
  try {
    const container = await getContainer(containerName);
    
    // Query with company filter
    const querySpec = {
      query: 'SELECT * FROM c WHERE c.companyId = @companyId',
      parameters: [{ name: '@companyId', value: companyId }],
    };

    const { resources } = await container.items.query(querySpec).fetchAll();
    
    return {
      container: containerName,
      status: resources.length > 0 ? 'success' : 'warning',
      count: resources.length,
      sampleId: resources[0]?.id,
      issues: resources.length === 0 ? [`No ${containerName} found for AmeriVet`] : [],
    };
  } catch (error) {
    logger.error(`Failed to validate ${containerName}`, error);
    return {
      container: containerName,
      status: 'error',
      count: 0,
      issues: [`Query failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
    };
  }
}

export const GET = requireCompanyAdmin(async (req: NextRequest, { user }) => {
  try {
    logger.info('Starting data validation', { userId: user.id });

    const results: ValidationResult[] = [];

    // Validate all critical containers
    const containers = [
      'Users',
      'Companies',
      'Benefits',
      'Documents',
      'FAQs',
      'DocumentChunks',
      'Conversations',
    ];

    for (const containerName of containers) {
      const result = await validateContainer(containerName);
      results.push(result);
    }

    // Calculate summary statistics
    const successCount = results.filter(r => r.status === 'success').length;
    const warningCount = results.filter(r => r.status === 'warning').length;
    const errorCount = results.filter(r => r.status === 'error').length;
    const totalRecords = results.reduce((sum, r) => sum + r.count, 0);

    const summary = {
      timestamp: new Date().toISOString(),
      totalContainers: results.length,
      successCount,
      warningCount,
      errorCount,
      totalRecords,
      overallStatus: errorCount === 0 
        ? (warningCount === 0 ? 'operational' : 'warnings') 
        : 'errors',
    };

    const allIssues = results.flatMap(r => r.issues);

    logger.info('Data validation completed', {
      summary,
      hasIssues: allIssues.length > 0,
    });

    return NextResponse.json({
      success: errorCount === 0,
      summary,
      results,
      issues: allIssues,
      message: errorCount === 0 
        ? '✅ Real AmeriVet data successfully loaded and accessible'
        : '❌ Issues detected with data validation',
    });

  } catch (error) {
    logger.error('Data validation endpoint failed', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Data validation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});
