/**
 * Test script for hybrid retrieval system
 * Prerequisites: Azure Search index must exist with sample data
 * Run: npx tsx scripts/test-hybrid-retrieval.ts
 */

import {
  hybridRetrieve,
  retrieveVectorTopK,
  retrieveBM25TopK,
  rrfMerge,
  buildContext,
  calculateCoverage,
} from "../lib/rag/hybrid-retrieval";
import type { RetrievalContext } from "../types/rag";

// Test configuration
const TEST_COMPANY_ID = "test-company-001";
const TEST_QUERIES = [
  "What is a PPO plan?",
  "Compare dental coverage between plans",
  "How much does family coverage cost?",
];

async function testHybridRetrieval() {
  console.log("=".repeat(80));
  console.log("Hybrid Retrieval System Test");
  console.log("=".repeat(80));
  console.log("");

  const context: RetrievalContext = {
    companyId: TEST_COMPANY_ID,
    planYear: 2025,
  };

  for (const query of TEST_QUERIES) {
    console.log("─".repeat(80));
    console.log(`Query: "${query}"`);
    console.log("─".repeat(80));

    try {
      const startTime = Date.now();

      // Execute hybrid retrieval
      const result = await hybridRetrieve(query, context, {
        vectorK: 12,
        bm25K: 12,
        finalTopK: 8,
        rerankedTopK: 5,
        enableReranking: false,
      });

      const totalTime = Date.now() - startTime;

      // Display results
      console.log(`\nRetrieval completed in ${totalTime}ms`);
      console.log(`Total chunks retrieved: ${result.totalResults}`);
      console.log(`Final chunks returned: ${result.chunks.length}`);
      console.log(`Method: ${result.method}`);

      // Show top chunks
      console.log("\nTop Chunks:");
      result.chunks.slice(0, 3).forEach((chunk, idx) => {
        console.log(`  ${idx + 1}. ${chunk.title} (${chunk.sectionPath})`);
        console.log(`     Score: ${chunk.metadata.relevanceScore?.toFixed(4) || "N/A"}`);
        console.log(`     Preview: ${chunk.content.substring(0, 100)}...`);
      });

      // Calculate coverage
      const coverage = calculateCoverage(query, result.chunks);
      console.log(`\nCoverage: ${(coverage * 100).toFixed(1)}%`);

      // Build context
      const contextText = buildContext(result.chunks, 1000);
      console.log(`\nContext size: ${contextText.length} chars (~${Math.ceil(contextText.length / 4)} tokens)`);

      // Performance check
      if (totalTime > 2000) {
        console.log(`⚠️  WARNING: Latency ${totalTime}ms exceeds 2s budget`);
      } else {
        console.log(`✓ Latency within budget (${totalTime}ms < 2000ms)`);
      }

      console.log("");
    } catch (error) {
      console.error(`✗ Error:`, error instanceof Error ? error.message : String(error));
      console.log("");
    }
  }

  console.log("=".repeat(80));
  console.log("Test Complete");
  console.log("=".repeat(80));
}

async function testRRFMerge() {
  console.log("\n" + "=".repeat(80));
  console.log("RRF Merge Test (Stub Data)");
  console.log("=".repeat(80));
  console.log("");

  // Create stub chunks for testing RRF logic
  const createStubChunk = (id: string, docId: string, content: string) => ({
    id,
    docId,
    companyId: TEST_COMPANY_ID,
    sectionPath: "test/section",
    content,
    title: `Document ${docId}`,
    position: 0,
    windowStart: 0,
    windowEnd: content.length,
    metadata: { tokenCount: Math.ceil(content.length / 4) },
    createdAt: new Date(),
  });

  const vectorResults = [
    createStubChunk("v1", "doc1", "Vector result 1"),
    createStubChunk("v2", "doc2", "Vector result 2"),
    createStubChunk("v3", "doc3", "Vector result 3"),
    createStubChunk("v4", "doc4", "Vector result 4"),
  ];

  const bm25Results = [
    createStubChunk("v2", "doc2", "BM25 result 1 (overlap with vector)"),
    createStubChunk("b2", "doc5", "BM25 result 2"),
    createStubChunk("v1", "doc1", "BM25 result 3 (overlap with vector)"),
    createStubChunk("b4", "doc6", "BM25 result 4"),
  ];

  console.log("Vector results: ", vectorResults.map((c) => c.id));
  console.log("BM25 results:   ", bm25Results.map((c) => c.id));

  const merged = rrfMerge([vectorResults, bm25Results], 60, 6);

  console.log("\nMerged results (top 6):");
  merged.forEach((chunk, idx) => {
    console.log(`  ${idx + 1}. ${chunk.id} (RRF score: ${chunk.metadata.rrfScore?.toFixed(4)})`);
  });

  console.log("\nExpected behavior:");
  console.log("  - Chunks appearing in both sets (v1, v2) should rank higher");
  console.log("  - Early-ranked chunks should score better than late-ranked");
  console.log("  - Total unique chunks: " + new Set([...vectorResults, ...bm25Results].map((c) => c.id)).size);
}

// Run tests
(async () => {
  console.log("NOTE: This test requires Azure Search to be configured with sample data.");
  console.log("If search fails, check .env.production for AZURE_SEARCH_* variables.\n");

  try {
    await testRRFMerge();
    await testHybridRetrieval();
  } catch (error) {
    console.error("\nFatal error:", error);
    process.exit(1);
  }
})();
