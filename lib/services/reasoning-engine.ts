import { logger } from '@/lib/logger';

interface ReasoningContext {
  query: string;
  userProfile?: {
    age?: number;
    familyStatus?: 'single' | 'married' | 'family';
    healthStatus?: 'healthy' | 'chronic' | 'unknown';
    income?: 'low' | 'medium' | 'high';
  };
  queryHistory?: string[];
  attachments?: any[];
}

interface ReasoningResult {
  decision: string;
  confidence: number;
  reasoning: string[];
  alternatives: string[];
  nextSteps: string[];
  modelUsed: string;
  processingTime: number;
}

export class ReasoningEngine {
  private startTime: number = 0;

  constructor() {
    this.startTime = Date.now();
  }

  async reasonAboutQuery(context: ReasoningContext): Promise<ReasoningResult> {
    const startTime = Date.now();
    const reasoning: string[] = [];
    const alternatives: string[] = [];
    const nextSteps: string[] = [];

    try {
      console.log(`🧠 [REASONING] Starting analysis for: "${context.query.substring(0, 50)}..."`);
      
      // Step 1: Analyze query intent
      const intent = this.analyzeIntent(context.query);
      reasoning.push(`Intent analysis: ${intent.description}`);
      
      // Step 2: Assess complexity
      const complexity = this.assessComplexity(context.query, context.userProfile);
      reasoning.push(`Complexity assessment: ${complexity.level} (${complexity.score}/10)`);
      
      // Step 3: Determine routing strategy
      const routing = this.determineRoutingStrategy(intent, complexity, context);
      reasoning.push(`Routing strategy: ${routing.strategy} (confidence: ${routing.confidence})`);
      
      // Step 4: Consider alternatives
      alternatives.push(...this.generateAlternatives(intent, complexity));
      
      // Step 5: Generate next steps
      nextSteps.push(...this.generateNextSteps(intent, routing));
      
      // Step 6: Final decision
      const decision = this.makeFinalDecision(routing, context);
      
      const processingTime = Date.now() - startTime;
      
      console.log(`✅ [REASONING] Analysis complete in ${processingTime}ms`);
      console.log(`🎯 [DECISION] ${decision}`);
      
      return {
        decision,
        confidence: routing.confidence,
        reasoning,
        alternatives,
        nextSteps,
        modelUsed: 'Hybrid-Reasoning-Engine-v1.0',
        processingTime
      };
      
    } catch (error) {
      logger.error('Error in reasoning engine', { error, context });
      return this.getFallbackReasoning(context, Date.now() - startTime);
    }
  }

  private analyzeIntent(query: string): { type: string; description: string; keywords: string[] } {
    const lowerQuery = query.toLowerCase();
    const keywords: string[] = [];
    
    // Extract keywords
    const keywordPatterns = [
      'hsa', 'kaiser', 'dental', 'vision', 'cost', 'premium', 'deductible',
      'copay', 'coverage', 'plan', 'compare', 'calculate', 'recommend',
      'family', 'single', 'age', 'healthy', 'document', 'upload', 'pdf'
    ];
    
    keywordPatterns.forEach(keyword => {
      if (lowerQuery.includes(keyword)) {
        keywords.push(keyword);
      }
    });
    
    // Determine intent type
    let type = 'general';
    let description = 'General benefits inquiry';
    
    if (lowerQuery.includes('what is') || lowerQuery.includes('explain')) {
      type = 'explanation';
      description = 'Seeking explanation or definition';
    } else if (lowerQuery.includes('compare') || lowerQuery.includes('vs')) {
      type = 'comparison';
      description = 'Requesting comparison between options';
    } else if (lowerQuery.includes('calculate') || lowerQuery.includes('cost')) {
      type = 'calculation';
      description = 'Need cost calculation or analysis';
    } else if (lowerQuery.includes('recommend') || lowerQuery.includes('should i')) {
      type = 'recommendation';
      description = 'Seeking personalized recommendation';
    } else if (lowerQuery.includes('document') || lowerQuery.includes('upload')) {
      type = 'document_analysis';
      description = 'Document upload and analysis request';
    } else if (lowerQuery.includes('help') || lowerQuery.includes('confused')) {
      type = 'assistance';
      description = 'General help or clarification needed';
    }
    
    return { type, description, keywords };
  }

  private assessComplexity(query: string, userProfile?: any): { level: string; score: number; factors: string[] } {
    let score = 0;
    const factors: string[] = [];
    const lowerQuery = query.toLowerCase();
    
    // Length factor
    if (query.length > 100) {
      score += 2;
      factors.push('Long query');
    } else if (query.length > 50) {
      score += 1;
      factors.push('Medium length');
    }
    
    // Personal information factor
    if (lowerQuery.includes('i ') || lowerQuery.includes('my ') || lowerQuery.includes('me ')) {
      score += 2;
      factors.push('Personal context');
    }
    
    // Age/specific details factor
    if (/\b(2[0-9]|3[0-9]|4[0-9]|5[0-9])\b/.test(query)) {
      score += 2;
      factors.push('Specific age mentioned');
    }
    
    // Family context factor
    if (lowerQuery.includes('family') || lowerQuery.includes('children') || lowerQuery.includes('spouse')) {
      score += 2;
      factors.push('Family context');
    }
    
    // Comparison factor
    if (lowerQuery.includes('compare') || lowerQuery.includes('vs') || lowerQuery.includes('difference')) {
      score += 2;
      factors.push('Comparison request');
    }
    
    // Calculation factor
    if (lowerQuery.includes('calculate') || lowerQuery.includes('cost') || lowerQuery.includes('total')) {
      score += 1;
      factors.push('Calculation needed');
    }
    
    // Document factor
    if (lowerQuery.includes('document') || lowerQuery.includes('pdf') || lowerQuery.includes('upload')) {
      score += 3;
      factors.push('Document analysis');
    }
    
    // User profile factor
    if (userProfile) {
      if (userProfile.familyStatus === 'family') {
        score += 1;
        factors.push('Family user profile');
      }
      if (userProfile.healthStatus === 'chronic') {
        score += 1;
        factors.push('Chronic health condition');
      }
    }
    
    // Determine complexity level
    let level = 'simple';
    if (score >= 6) {
      level = 'complex';
    } else if (score >= 3) {
      level = 'moderate';
    }
    
    return { level, score, factors };
  }

  private determineRoutingStrategy(intent: any, complexity: any, context: ReasoningContext): { strategy: string; confidence: number; reasoning: string } {
    let strategy = 'pattern';
    let confidence = 0.7;
    let reasoning = '';
    
    // High confidence pattern matching for simple, well-defined queries
    if (complexity.level === 'simple' && 
        (intent.type === 'explanation' || intent.type === 'general') &&
        intent.keywords.length > 0) {
      strategy = 'pattern';
      confidence = 0.9;
      reasoning = 'Simple query with clear keywords - pattern matching optimal';
    }
    
    // LLM for complex personal queries
    else if (complexity.level === 'complex' || 
             intent.type === 'recommendation' ||
             (intent.type === 'comparison' && complexity.score > 4)) {
      strategy = 'llm';
      confidence = 0.85;
      reasoning = 'Complex personal query requiring nuanced analysis';
    }
    
    // RAG for document analysis
    else if (intent.type === 'document_analysis' || (context.attachments?.length ?? 0) > 0) {
      strategy = 'rag';
      confidence = 0.9;
      reasoning = 'Document analysis requires RAG processing';
    }
    
    // LLM for moderate complexity with personal context
    else if (complexity.level === 'moderate' && 
             (intent.type === 'calculation' || intent.type === 'comparison')) {
      strategy = 'llm';
      confidence = 0.8;
      reasoning = 'Moderate complexity with analytical requirements';
    }
    
    // Pattern matching for standard benefit questions
    else if (intent.keywords.some((k: string) => ['hsa', 'kaiser', 'dental', 'vision'].includes(k))) {
      strategy = 'pattern';
      confidence = 0.8;
      reasoning = 'Standard benefit category with established patterns';
    }
    
    // Fallback to LLM for assistance requests
    else if (intent.type === 'assistance') {
      strategy = 'llm';
      confidence = 0.75;
      reasoning = 'General assistance request - LLM provides flexible response';
    }
    
    return { strategy, confidence, reasoning };
  }

  private generateAlternatives(intent: any, complexity: any): string[] {
    const alternatives: string[] = [];
    
    // Suggest alternative approaches based on intent
    if (intent.type === 'comparison') {
      alternatives.push('Use cost calculator for detailed analysis');
      alternatives.push('Provide side-by-side plan comparison table');
    }
    
    if (intent.type === 'recommendation') {
      alternatives.push('Ask clarifying questions about user situation');
      alternatives.push('Provide decision tree for plan selection');
    }
    
    if (complexity.level === 'complex') {
      alternatives.push('Break down into simpler sub-questions');
      alternatives.push('Use step-by-step guided approach');
    }
    
    if (intent.keywords.includes('cost')) {
      alternatives.push('Show interactive cost calculator');
      alternatives.push('Provide real-world cost examples');
    }
    
    return alternatives;
  }

  private generateNextSteps(intent: any, routing: any): string[] {
    const nextSteps: string[] = [];
    
    if (routing.strategy === 'pattern') {
      nextSteps.push('Match query against predefined patterns');
      nextSteps.push('Retrieve appropriate response template');
      nextSteps.push('Personalize response if needed');
    }
    
    if (routing.strategy === 'llm') {
      nextSteps.push('Prepare context and user profile');
      nextSteps.push('Select appropriate LLM model based on complexity');
      nextSteps.push('Generate response with reasoning');
    }
    
    if (routing.strategy === 'rag') {
      nextSteps.push('Extract text from uploaded document');
      nextSteps.push('Process with embeddings for context');
      nextSteps.push('Generate response with document insights');
    }
    
    nextSteps.push('Cache response for future similar queries');
    nextSteps.push('Log interaction for model improvement');
    
    return nextSteps;
  }

  private makeFinalDecision(routing: any, context: ReasoningContext): string {
    const { strategy, confidence } = routing;
    
    let decision = `Route to ${strategy.toUpperCase()} processing`;
    
    if (confidence > 0.9) {
      decision += ' (HIGH CONFIDENCE)';
    } else if (confidence > 0.8) {
      decision += ' (GOOD CONFIDENCE)';
    } else {
      decision += ' (MODERATE CONFIDENCE)';
    }
    
    if (context.userProfile) {
      decision += ` with user profile context`;
    }
    
    if ((context.attachments?.length ?? 0) > 0) {
      decision += ` and document analysis`;
    }
    
    return decision;
  }

  private getFallbackReasoning(context: ReasoningContext, processingTime: number): ReasoningResult {
    return {
      decision: 'Route to PATTERN processing (FALLBACK)',
      confidence: 0.5,
      reasoning: ['Error in reasoning engine', 'Using fallback pattern matching'],
      alternatives: ['Try simpler query', 'Contact support if issue persists'],
      nextSteps: ['Use basic pattern matching', 'Log error for debugging'],
      modelUsed: 'Fallback-Reasoning-Engine',
      processingTime
    };
  }

  // Method to get reasoning statistics
  getReasoningStats(): {
    totalQueries: number;
    averageProcessingTime: number;
    confidenceDistribution: Record<string, number>;
  } {
    // This would track real statistics in production
    return {
      totalQueries: 0,
      averageProcessingTime: 0,
      confidenceDistribution: {
        'high': 0,
        'medium': 0,
        'low': 0
      }
    };
  }
}

export const reasoningEngine = new ReasoningEngine();
