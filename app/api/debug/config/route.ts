/**
 * Debug Config Endpoint
 * Shows sanitized environment variables (after CR/LF removal and trimming)
 * IMPORTANT: Remove or restrict access after debugging
 */

import { NextResponse } from 'next/server';
import { ENV } from '@/lib/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      config: {
        azureOpenAI: {
          endpoint: ENV.AZURE_OPENAI_ENDPOINT,
          apiKeyPresent: !!ENV.AZURE_OPENAI_API_KEY,
          apiKeyLength: ENV.AZURE_OPENAI_API_KEY.length,
          apiVersion: ENV.AZURE_OPENAI_API_VERSION,
          embeddingDeployment: ENV.AZURE_OPENAI_EMBEDDING_DEPLOYMENT,
          deploymentL1: ENV.AZURE_OPENAI_DEPLOYMENT_L1,
          deploymentL2: ENV.AZURE_OPENAI_DEPLOYMENT_L2,
          deploymentL3: ENV.AZURE_OPENAI_DEPLOYMENT_L3,
        },
        azureSearch: {
          endpoint: ENV.AZURE_SEARCH_ENDPOINT,
          apiKeyPresent: !!ENV.AZURE_SEARCH_API_KEY,
          indexName: ENV.AZURE_SEARCH_INDEX_NAME,
          vectorField: ENV.AZURE_SEARCH_VECTOR_FIELD,
        },
        environment: ENV.VERCEL_ENV,
        nodeEnv: ENV.NODE_ENV,
      },
    });
  } catch (error) {
    console.error('[Debug Config]', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
