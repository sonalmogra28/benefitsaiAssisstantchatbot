/**
 * Test Azure OpenAI embeddings generation
 */

import 'dotenv/config';

const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
const apiKey = process.env.AZURE_OPENAI_API_KEY;
const deployment = process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT;
const apiVersion = process.env.AZURE_OPENAI_API_VERSION;

console.log('\n🧪 Testing Azure OpenAI Embeddings\n');
console.log(`Endpoint: ${endpoint}`);
console.log(`Deployment: ${deployment}`);
console.log(`API Version: ${apiVersion}`);
console.log(`API Key: ${apiKey ? 'SET' : 'MISSING'}\n`);

const testQuery = "What dental coverage is available?";

try {
  const url = `${endpoint}/openai/deployments/${deployment}/embeddings?api-version=${apiVersion}`;
  
  console.log(`Generating embedding for: "${testQuery}"\n`);
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey
    },
    body: JSON.stringify({
      input: testQuery
    })
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`❌ Error ${response.status}:`, error);
    process.exit(1);
  }

  const data = await response.json();
  const embedding = data.data[0].embedding;
  
  console.log(`✅ SUCCESS!`);
  console.log(`   Embedding dimensions: ${embedding.length}`);
  console.log(`   First 5 values: [${embedding.slice(0, 5).join(', ')}...]\n`);
  console.log(`🎉 Azure OpenAI embeddings are working!\n`);
  
} catch (error) {
  console.error(`❌ Failed:`, error.message);
  process.exit(1);
}
