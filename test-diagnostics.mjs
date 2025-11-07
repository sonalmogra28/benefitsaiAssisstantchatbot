/**
 * Test script to verify diagnostic logging
 * Run with: node test-diagnostics.mjs
 */

// Use Node's built-in fetch (Node 18+)
async function testDiagnostics() {
  console.log('\n🔍 DIAGNOSTIC TEST\n');
  console.log('Testing QA endpoint with diagnostic logging...\n');

  const testQuery = {
    query: 'What dental coverage is available?',
    conversationId: 'diagnostic-test-001',
    companyId: 'amerivet',
    userId: 'test-user-1'
  };

  console.log('📤 Sending request:', testQuery);
  console.log('');

  try {
    const response = await fetch('http://localhost:8080/api/qa', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testQuery),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    
    console.log('✅ Response received!');
    console.log(`  Answer length: ${data.answer?.length || 0} chars`);
    console.log(`  Chunks: ${data.chunks?.length || 0}`);
    console.log(`  Grounding: ${data.groundingScore || 'N/A'}`);
    console.log(`  Tier: ${data.tier || 'N/A'}`);
    console.log('');

    if (data.chunks?.length === 0) {
      console.log('⚠️  ZERO CHUNKS! This confirms the issue.');
      console.log('');
      console.log('Check server console output for:');
      console.log('  [QA][DEBUG] Request received - shows companyId value');
      console.log('  [SEARCH][VECTOR] Query - shows filter being used');
      console.log('  [SEARCH][VECTOR] ✅/⚠️ - shows result count');
      console.log('  [SEARCH][BM25] ✅/⚠️ - shows result count');
    } else {
      console.log('✅ SUCCESS! Retrieved chunks from index.');
      console.log(`\nFirst chunk preview: ${data.chunks[0]?.content?.substring(0, 100)}...`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run test
testDiagnostics();
