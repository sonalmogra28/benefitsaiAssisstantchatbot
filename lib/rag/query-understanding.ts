/**
 * Query Understanding Module
 * Bootstrap Step 4: Analyze user queries for intent, entities, and complexity
 */

// ============================================================================
// Query Profile Interface
// ============================================================================

export interface QueryProfile {
  normalized: string;
  entities: Entity[];
  intent: IntentType;
  complexity: number;        // 0-1 score
  needsTool: boolean;
  riskScore: number;         // 0-1 score
  signals: {
    queryLength: number;
    hasOperators: boolean;
    hasQuestionMark: boolean;
    hasComparison: boolean;
    hasCalculation: boolean;
    hasMultipleTopics: boolean;
  };
}

export type IntentType =
  | "lookup"          // Simple FAQ lookup
  | "compare"         // Compare plans/benefits
  | "calculate"       // Cost/coverage calculation
  | "eligibility"     // Enrollment/eligibility check
  | "procedure"       // How-to/process question
  | "definition"      // Term definition
  | "unknown";        // Cannot determine

export interface Entity {
  type: EntityType;
  value: string;
  confidence: number;
  span: [number, number];
}

export type EntityType =
  | "benefit_type"    // "dental", "vision", "401k"
  | "plan_name"       // "PPO", "HMO", "HDHP"
  | "carrier"         // "Aetna", "UnitedHealthcare"
  | "date"            // "2025", "January 1"
  | "amount"          // "$500", "80%"
  | "person"          // "spouse", "dependent"
  | "location"        // "in-network", "out-of-network"
  | "procedure_code"; // "CPT-12345"

// ============================================================================
// Query Normalization
// ============================================================================

/**
 * Normalize query for consistent processing
 * - Lowercase
 * - Trim whitespace
 * - Remove extra spaces
 * - Normalize unicode
 * - Remove special chars (but keep operators)
 */
export function normalizeQuery(query: string): string {
  return query
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .normalize("NFKC")
    .replace(/[^\w\s\-?.,()%$]/g, "");
}

// ============================================================================
// Intent Detection
// ============================================================================

/**
 * Detect user intent from query patterns
 * Uses heuristic rules based on keywords and structure
 */
export function detectIntent(query: string): IntentType {
  const normalized = query.toLowerCase();

  // Definition intent: "what is", "define", "meaning of"
  if (
    /^what is\b/.test(normalized) ||
    /^define\b/.test(normalized) ||
    /\bmeaning of\b/.test(normalized) ||
    /^explain\b/.test(normalized)
  ) {
    return "definition";
  }

  // Comparison intent: "compare", "difference between", "versus", "vs"
  if (
    /\bcompare\b/.test(normalized) ||
    /\bdifference between\b/.test(normalized) ||
    /\bversus\b/.test(normalized) ||
    /\bvs\.?\b/.test(normalized) ||
    /\bor\b.*\bor\b/.test(normalized) // "A or B or C"
  ) {
    return "compare";
  }

  // Calculation intent: "how much", "cost", "calculate", numbers + operators
  if (
    /\bhow much\b/.test(normalized) ||
    /\bcost\b/.test(normalized) ||
    /\bcalculate\b/.test(normalized) ||
    /\bpremium\b/.test(normalized) ||
    (/\d+/.test(normalized) && /[+\-*/%]/.test(normalized))
  ) {
    return "calculate";
  }

  // Eligibility intent: "eligible", "qualify", "enroll", "can I"
  if (
    /\beligible\b/.test(normalized) ||
    /\bqualify\b/.test(normalized) ||
    /\benroll\b/.test(normalized) ||
    /\bcan i\b/.test(normalized) ||
    /\bam i\b/.test(normalized)
  ) {
    return "eligibility";
  }

  // Procedure intent: "how to", "how do I", "steps", "process"
  if (
    /\bhow to\b/.test(normalized) ||
    /\bhow do i\b/.test(normalized) ||
    /\bsteps\b/.test(normalized) ||
    /\bprocess\b/.test(normalized) ||
    /\bprocedure\b/.test(normalized)
  ) {
    return "procedure";
  }

  // Lookup (default for simple questions)
  if (
    /^(what|when|where|who|which)\b/.test(normalized) ||
    /\?$/.test(normalized.trim())
  ) {
    return "lookup";
  }

  return "unknown";
}

// ============================================================================
// Entity Extraction
// ============================================================================

/**
 * Extract entities from query using regex patterns
 * Returns entities with type, value, confidence, and position
 */
export function detectEntities(query: string): Entity[] {
  const entities: Entity[] = [];
  const normalized = query.toLowerCase();

  // Benefit types
  const benefitPatterns = [
    { regex: /\b(dental|vision|medical|health|life insurance|disability|401k|hsa|fsa)\b/gi, type: "benefit_type" as const },
  ];

  // Plan names
  const planPatterns = [
    { regex: /\b(ppo|hmo|hdhp|pos|epo|traditional|standard|premium|basic)\b/gi, type: "plan_name" as const },
  ];

  // Carriers
  const carrierPatterns = [
    { regex: /\b(aetna|anthem|blue cross|blue shield|cigna|humana|kaiser|united healthcare|uhc)\b/gi, type: "carrier" as const },
  ];

  // Dates
  const datePatterns = [
    { regex: /\b(20\d{2})\b/g, type: "date" as const },
    { regex: /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}/gi, type: "date" as const },
  ];

  // Amounts
  const amountPatterns = [
    { regex: /\$[\d,]+(\.\d{2})?/g, type: "amount" as const },
    { regex: /\b\d+%/g, type: "amount" as const },
  ];

  // People
  const personPatterns = [
    { regex: /\b(spouse|dependent|child|children|employee|family|domestic partner)\b/gi, type: "person" as const },
  ];

  // Locations
  const locationPatterns = [
    { regex: /\b(in-network|out-of-network|in network|out of network)\b/gi, type: "location" as const },
  ];

  // Process all patterns
  const allPatterns = [
    ...benefitPatterns,
    ...planPatterns,
    ...carrierPatterns,
    ...datePatterns,
    ...amountPatterns,
    ...personPatterns,
    ...locationPatterns,
  ];

  for (const { regex, type } of allPatterns) {
    const matches = Array.from(query.matchAll(regex));
    for (const match of matches) {
      if (match.index !== undefined) {
        entities.push({
          type,
          value: match[0],
          confidence: 0.8, // Simple regex has fixed confidence
          span: [match.index, match.index + match[0].length],
        });
      }
    }
  }

  return entities;
}

// ============================================================================
// Complexity Scoring
// ============================================================================

/**
 * Compute query complexity score (0-1)
 * Based on multiple signals:
 * - Query length
 * - Number of entities
 * - Logical operators (and, or, not)
 * - Multi-hop reasoning indicators
 * - Ambiguity markers
 */
export function computeComplexity(query: string, entities: Entity[]): number {
  let score = 0;
  const normalized = query.toLowerCase();

  // Length factor (0-0.2)
  const charCount = query.length;
  if (charCount > 200) score += 0.2;
  else if (charCount > 100) score += 0.15;
  else if (charCount > 50) score += 0.1;
  else score += 0.05;

  // Entity count (0-0.2)
  const entityCount = entities.length;
  if (entityCount > 5) score += 0.2;
  else if (entityCount > 3) score += 0.15;
  else if (entityCount > 1) score += 0.1;
  else score += 0.05;

  // Logical operators (0-0.2)
  const hasAnd = /\band\b/.test(normalized);
  const hasOr = /\bor\b/.test(normalized);
  const hasNot = /\bnot\b/.test(normalized);
  const operatorCount = [hasAnd, hasOr, hasNot].filter(Boolean).length;
  score += operatorCount * 0.07;

  // Multi-hop reasoning (0-0.2)
  const multiHopIndicators = [
    /\bthen\b/,
    /\bafter\b/,
    /\bbefore\b/,
    /\bif\b.*\bthen\b/,
    /\bdepend/,
    /\bvaries\b/,
  ];
  const multiHopCount = multiHopIndicators.filter((re) => re.test(normalized)).length;
  score += Math.min(multiHopCount * 0.05, 0.2);

  // Comparison complexity (0-0.1)
  if (/\bcompare\b/.test(normalized)) score += 0.1;
  if (/\bdifference\b/.test(normalized)) score += 0.1;

  // Ambiguity markers (0-0.1)
  const ambiguityMarkers = [
    /\bmaybe\b/,
    /\bpossibly\b/,
    /\bsometimes\b/,
    /\bvarious\b/,
    /\bdepends\b/,
  ];
  const ambiguityCount = ambiguityMarkers.filter((re) => re.test(normalized)).length;
  score += Math.min(ambiguityCount * 0.03, 0.1);

  // Cap at 1.0
  return Math.min(score, 1.0);
}

// ============================================================================
// Tool Detection
// ============================================================================

/**
 * Detect if query requires external tools
 * - Math calculations
 * - Table lookups
 * - API calls (claims status, etc.)
 * - File/document retrieval
 */
export function detectToolNeeds(query: string, intent: IntentType): boolean {
  const normalized = query.toLowerCase();

  // Calculation intent almost always needs tools
  if (intent === "calculate") return true;

  // Math operators present
  if (/[+\-*/%]/.test(query) && /\d+/.test(query)) return true;

  // Table/spreadsheet indicators
  if (
    /\btable\b/.test(normalized) ||
    /\bspreadsheet\b/.test(normalized) ||
    /\bchart\b/.test(normalized)
  ) {
    return true;
  }

  // API/system indicators
  if (
    /\bclaim status\b/.test(normalized) ||
    /\bcheck.*status\b/.test(normalized) ||
    /\blookup\b/.test(normalized)
  ) {
    return true;
  }

  // Complex calculations
  if (
    /\bcalculate\b/.test(normalized) ||
    /\bestimate\b/.test(normalized) ||
    /\bprojection\b/.test(normalized)
  ) {
    return true;
  }

  return false;
}

// ============================================================================
// Risk Scoring
// ============================================================================

/**
 * Compute risk score for compliance/HR sensitivity (0-1)
 * Higher score = higher risk, requires careful handling
 */
export function computeRiskScore(query: string, entities: Entity[]): number {
  let score = 0;
  const normalized = query.toLowerCase();

  // Legal/compliance keywords (0-0.4)
  const legalKeywords = [
    /\blegal\b/,
    /\blawsuit\b/,
    /\bdiscrimination\b/,
    /\bharassment\b/,
    /\bviolation\b/,
    /\bcomplaint\b/,
    /\bfmla\b/,
    /\bada\b/,
    /\bcobra\b/,
    /\bhipaa\b/,
  ];
  const legalCount = legalKeywords.filter((re) => re.test(normalized)).length;
  score += Math.min(legalCount * 0.1, 0.4);

  // Termination/disciplinary (0-0.3)
  const disciplinaryKeywords = [
    /\btermination\b/,
    /\bfired\b/,
    /\blayoff\b/,
    /\bdisciplinary\b/,
    /\bwarning\b/,
  ];
  const disciplinaryCount = disciplinaryKeywords.filter((re) => re.test(normalized)).length;
  score += Math.min(disciplinaryCount * 0.1, 0.3);

  // Personal health info (0-0.2)
  const phiKeywords = [
    /\bdiagnosis\b/,
    /\bmedication\b/,
    /\btreatment\b/,
    /\btherapy\b/,
    /\bmental health\b/,
  ];
  const phiCount = phiKeywords.filter((re) => re.test(normalized)).length;
  score += Math.min(phiCount * 0.05, 0.2);

  // Financial sensitivity (0-0.1)
  const hasLargeAmount = entities.some(
    (e) => e.type === "amount" && /\$\d{4,}/.test(e.value)
  );
  if (hasLargeAmount) score += 0.1;

  return Math.min(score, 1.0);
}

// ============================================================================
// Main Query Analysis Function
// ============================================================================

/**
 * Analyze query and return complete profile
 * Entry point for query understanding
 */
export function analyzeQuery(query: string): QueryProfile {
  const normalized = normalizeQuery(query);
  const entities = detectEntities(query);
  const intent = detectIntent(query);
  const complexity = computeComplexity(query, entities);
  const needsTool = detectToolNeeds(query, intent);
  const riskScore = computeRiskScore(query, entities);

  // Extract signals
  const signals = {
    queryLength: query.length,
    hasOperators: /\b(and|or|not)\b/i.test(query),
    hasQuestionMark: query.includes("?"),
    hasComparison: intent === "compare",
    hasCalculation: intent === "calculate" || needsTool,
    hasMultipleTopics: entities.filter((e) => e.type === "benefit_type").length > 1,
  };

  return {
    normalized,
    entities,
    intent,
    complexity,
    needsTool,
    riskScore,
    signals,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Extract key phrases from query for logging/debugging
 */
export function extractKeyPhrases(query: string): string[] {
  const normalized = normalizeQuery(query);
  const words = normalized.split(/\s+/);

  // Filter out stop words
  const stopWords = new Set([
    "a", "an", "the", "is", "are", "was", "were", "be", "been",
    "have", "has", "had", "do", "does", "did", "will", "would",
    "can", "could", "should", "may", "might", "must",
    "i", "you", "he", "she", "it", "we", "they",
    "my", "your", "his", "her", "its", "our", "their",
    "this", "that", "these", "those",
    "of", "in", "on", "at", "to", "for", "with", "from", "by",
  ]);

  return words.filter((word) => word.length > 2 && !stopWords.has(word));
}

/**
 * Format query profile for logging
 */
export function formatQueryProfile(profile: QueryProfile): string {
  return [
    `Query: "${profile.normalized}"`,
    `Intent: ${profile.intent}`,
    `Complexity: ${(profile.complexity * 100).toFixed(0)}%`,
    `Risk: ${(profile.riskScore * 100).toFixed(0)}%`,
    `Entities: ${profile.entities.length} (${profile.entities.map((e) => e.type).join(", ")})`,
    `Needs Tool: ${profile.needsTool ? "Yes" : "No"}`,
  ].join(" | ");
}
