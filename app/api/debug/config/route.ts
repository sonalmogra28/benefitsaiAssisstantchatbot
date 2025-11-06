/**
 * Debug Config Endpoint
 * Shows which Azure OpenAI environment variables are visible to the application
 * IMPORTANT: Remove or restrict access after debugging
 */

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const config = {
      azureOpenAI: {
        endpoint: process.env.AZURE_OPENAI_ENDPOINT || '(not set)',
        apiKeyPresent: !!process.env.AZURE_OPENAI_API_KEY,
        apiKeyLength: process.env.AZURE_OPENAI_API_KEY?.length || 0,
        apiVersion: process.env.AZURE_OPENAI_API_VERSION || '(not set)',
        embeddingDeployment: process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT || '(not set)',
        embeddingsDeployment: process.env.AZURE_OPENAI_EMBEDDINGS_DEPLOYMENT || '(not set)',
        deploymentL1: process.env.AZURE_OPENAI_DEPLOYMENT_L1 || '(not set)',
        deploymentL2: process.env.AZURE_OPENAI_DEPLOYMENT_L2 || '(not set)',
        deploymentL3: process.env.AZURE_OPENAI_DEPLOYMENT_L3 || '(not set)',
      },
      azureSearch: {
        endpoint: process.env.AZURE_SEARCH_ENDPOINT || '(not set)',
        apiKeyPresent: !!process.env.AZURE_SEARCH_API_KEY,
        indexName: process.env.AZURE_SEARCH_INDEX_NAME || '(not set)',
        vectorField: process.env.AZURE_SEARCH_VECTOR_FIELD || '(not set)',
      },
      environment: process.env.NEXT_PUBLIC_ENVIRONMENT || '(not set)',
      nodeEnv: process.env.NODE_ENV || '(not set)',
    };

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      config,
    });
  } catch (error) {
    console.error('[Debug Config]', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
