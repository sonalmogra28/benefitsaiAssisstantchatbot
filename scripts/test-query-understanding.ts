/**
 * Test script for query understanding module
 * Run: npx tsx scripts/test-query-understanding.ts
 */

import { analyzeQuery, formatQueryProfile } from "../lib/rag/query-understanding";

// Test queries covering different intents and complexities
const testQueries = [
  // Simple lookups (L1 candidates)
  "What is a PPO plan?",
  "When does open enrollment start?",
  "What dental benefits are covered?",
  
  // Comparisons (L2 candidates)
  "What is the difference between PPO and HMO?",
  "Compare Aetna vs UnitedHealthcare dental plans",
  "Should I choose HDHP or traditional plan?",
  
  // Calculations (L3 candidates)
  "How much will I pay for a $5000 medical procedure with 80% coverage?",
  "Calculate my annual premium for family coverage",
  "What is my deductible plus copay for specialist visit?",
  
  // Eligibility
  "Am I eligible for HSA with my current plan?",
  "Can my spouse enroll in dental coverage?",
  "Who qualifies for COBRA after termination?",
  
  // Procedures
  "How do I add a dependent to my health insurance?",
  "What are the steps to file a claim?",
  "How to change my 401k contribution?",
  
  // Complex multi-topic
  "If I enroll in the HDHP and max out my HSA, then get terminated, can I use COBRA and still contribute to HSA?",
  "Compare the out-of-pocket costs for in-network vs out-of-network providers across PPO and HMO plans for a family of 4",
  
  // High-risk queries
  "What are my rights under FMLA for mental health treatment?",
  "Can I be terminated for filing a discrimination complaint about benefits?",
  "HIPAA violation in benefits portal - what legal recourse?",
];

console.log("=".repeat(80));
console.log("Query Understanding Module Test");
console.log("=".repeat(80));
console.log("");

for (const query of testQueries) {
  const profile = analyzeQuery(query);
  
  console.log("─".repeat(80));
  console.log(`Query: "${query}"`);
  console.log("─".repeat(80));
  console.log(`Intent:      ${profile.intent}`);
  console.log(`Complexity:  ${(profile.complexity * 100).toFixed(0)}% ${getComplexityLabel(profile.complexity)}`);
  console.log(`Risk Score:  ${(profile.riskScore * 100).toFixed(0)}% ${getRiskLabel(profile.riskScore)}`);
  console.log(`Needs Tool:  ${profile.needsTool ? "✓ Yes" : "✗ No"}`);
  console.log(`Entities:    ${profile.entities.length} found`);
  
  if (profile.entities.length > 0) {
    const entitySummary = profile.entities
      .map((e) => `${e.type}:"${e.value}"`)
      .join(", ");
    console.log(`             ${entitySummary}`);
  }
  
  console.log(`Signals:     ${formatSignals(profile.signals)}`);
  console.log(`Tier Hint:   ${predictTier(profile)}`);
  console.log("");
}

console.log("=".repeat(80));
console.log("Test Complete");
console.log("=".repeat(80));

// Helper functions
function getComplexityLabel(score: number): string {
  if (score < 0.3) return "(Low)";
  if (score < 0.6) return "(Medium)";
  return "(High)";
}

function getRiskLabel(score: number): string {
  if (score < 0.2) return "(Low)";
  if (score < 0.5) return "(Medium)";
  return "(High)";
}

function formatSignals(signals: any): string {
  const active = [];
  if (signals.hasOperators) active.push("operators");
  if (signals.hasComparison) active.push("comparison");
  if (signals.hasCalculation) active.push("calculation");
  if (signals.hasMultipleTopics) active.push("multi-topic");
  return active.length > 0 ? active.join(", ") : "none";
}

function predictTier(profile: any): string {
  // Simple L1 logic
  if (
    profile.complexity < 0.3 &&
    !profile.needsTool &&
    profile.riskScore < 0.3 &&
    profile.entities.length <= 2
  ) {
    return "L1 (Simple/Fast)";
  }
  
  // Complex L3 logic
  if (
    profile.needsTool ||
    profile.complexity > 0.7 ||
    profile.riskScore > 0.6 ||
    profile.signals.hasMultipleTopics
  ) {
    return "L3 (Complex/Tools)";
  }
  
  // Default L2
  return "L2 (Moderate)";
}
