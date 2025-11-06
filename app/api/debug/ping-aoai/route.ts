/**
 * Azure OpenAI Connectivity Diagnostic Endpoint
 * Tests both chat and embedding deployments directly
 * @endpoint GET /api/debug/ping-aoai
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { azureOpenAIService } from '@/lib/azure/openai';

export async function GET() {
  const startTime = Date.now();
  const results: {
    chat?: { ok: boolean; latency?: number; error?: string };
    embedding?: { ok: boolean; latency?: number; dimensions?: number; error?: string };
  } = {};

  // Test chat completion
  try {
    const chatStart = Date.now();
    await azureOpenAIService.generateText('ping', { maxTokens: 1 });
    results.chat = {
      ok: true,
      latency: Date.now() - chatStart,
    };
  } catch (chatError: any) {
    results.chat = {
      ok: false,
      error: chatError?.message || 'Unknown error',
    };
  }

  // Test embedding generation
  try {
    const embStart = Date.now();
    const embedding = await azureOpenAIService.generateEmbedding('ping');
    results.embedding = {
      ok: true,
      latency: Date.now() - embStart,
      dimensions: embedding.length,
    };
  } catch (embError: any) {
    results.embedding = {
      ok: false,
      error: embError?.message || 'Unknown error',
    };
  }

  const totalLatency = Date.now() - startTime;
  const allOk = results.chat?.ok && results.embedding?.ok;

  return NextResponse.json(
    {
      success: allOk,
      totalLatency,
      results,
      timestamp: new Date().toISOString(),
    },
    { status: allOk ? 200 : 502 }
  );
}
