#!/usr/bin/env node
/**
 * Quick Chatbot Test Script
 * Tests RAG retrieval and Q&A functionality
 */

import http from 'http';

const BASE_URL = 'http://localhost:8080';

async function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: data ? JSON.parse(data) : null,
          });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function testRetrieval() {
  console.log('\n🔍 Testing Document Retrieval...');
  try {
    const result = await makeRequest('/api/debug/retrieval?query=dental+coverage');
    console.log('✅ Status:', result.status);
    
    if (result.data?.retrievedChunks) {
      console.log(`📄 Retrieved ${result.data.retrievedChunks.length} chunks`);
      result.data.retrievedChunks.slice(0, 2).forEach((chunk, i) => {
        console.log(`\nChunk ${i + 1}:`);
        console.log(`  Score: ${chunk.score}`);
        console.log(`  Content: ${chunk.content.substring(0, 100)}...`);
      });
    } else {
      console.log('⚠️ No chunks retrieved:', result.data);
    }
  } catch (error) {
    console.error('❌ Retrieval test failed:', error.message);
  }
}

async function testQA() {
  console.log('\n💬 Testing Q&A Endpoint...');
  try {
    const result = await makeRequest('/api/qa', 'POST', {
      query: 'dental coverage', // Exact query that works in debug endpoint
      conversationId: 'test-' + Date.now(),
      companyId: 'amerivet', // CRITICAL: Must match company_id in indexed documents
      userId: 'test-user',
    });
    
    console.log('✅ Status:', result.status);
    if (result.data?.answer) {
      console.log('📝 Answer:', result.data.answer.substring(0, 200) + '...');
      console.log('🎯 Tier:', result.data.metadata?.tier);
      console.log('📊 Grounding:', result.data.metadata?.groundingScore);
    } else {
      console.log('⚠️ Response:', result.data);
    }
  } catch (error) {
    console.error('❌ Q&A test failed:', error.message);
  }
}

async function main() {
  console.log('🚀 Benefits AI Chatbot - Quick Test');
  console.log('=====================================');
  
  // Wait for server
  console.log('\n⏳ Waiting for server to be ready...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  await testRetrieval();
  await testQA();
  
  console.log('\n✅ Tests complete!\n');
}

main().catch(console.error);
