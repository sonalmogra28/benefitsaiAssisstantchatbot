/**
 * Conversation Quality Tracker
 * Records and analyzes conversation quality metrics for analytics dashboards
 */

import { ConversationQuality, UserSatisfactionSurvey, Tier } from '../../types/rag';

/**
 * Quality metrics aggregation for dashboard display
 */
export interface QualityMetrics {
  // Response time metrics
  avgResponseTime: number;
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  
  // Grounding metrics
  avgGroundingScore: number;
  groundingDistribution: {
    excellent: number;   // >90%
    good: number;        // 70-90%
    poor: number;        // <70%
  };
  
  // Satisfaction metrics
  avgCSAT: number;         // Average 1-5 rating
  avgNPS: number;          // Average 0-10 rating
  npsCategory: {
    promoters: number;     // 9-10
    passives: number;      // 7-8
    detractors: number;    // 0-6
  };
  
  // Escalation metrics
  avgEscalationCount: number;
  firstContactResolutionRate: number;
  escalationRate: number;
  
  // Performance by tier
  byTier: {
    [key in Tier]: {
      count: number;
      avgResponseTime: number;
      avgGroundingScore: number;
      avgSatisfaction: number;
    };
  };
  
  // Cache performance
  cacheHitRate: number;
  
  // Volume metrics
  totalConversations: number;
  conversationsWithRatings: number;
  
  // Time period
  startTime: number;
  endTime: number;
}

/**
 * Conversation Quality Tracker Class
 */
export class QualityTracker {
  private static conversations: Map<string, ConversationQuality> = new Map();
  private static surveys: Map<string, UserSatisfactionSurvey> = new Map();
  
  /**
   * Record a conversation's quality metrics
   */
  static recordConversation(quality: ConversationQuality): void {
    this.conversations.set(quality.conversationId, quality);
    
    console.log('[QualityTracker] Conversation recorded', {
      conversationId: quality.conversationId,
      tier: quality.tier,
      responseTime: quality.responseTime,
      groundingScore: quality.groundingScore,
      escalationCount: quality.escalationCount,
      resolvedFirstContact: quality.resolvedFirstContact,
    });
  }
  
  /**
   * Record a user satisfaction survey
   */
  static recordSurvey(survey: UserSatisfactionSurvey): void {
    this.surveys.set(survey.surveyId, survey);
    
    // Link survey to conversation if it exists
    const conversation = this.conversations.get(survey.conversationId);
    if (conversation) {
      conversation.userSatisfactionRating = survey.csatRating;
      this.conversations.set(survey.conversationId, conversation);
    }
    
    console.log('[QualityTracker] Survey recorded', {
      surveyId: survey.surveyId,
      conversationId: survey.conversationId,
      csatRating: survey.csatRating,
      npsScore: survey.npsScore,
    });
  }
  
  /**
   * Get quality metrics for a time period
   */
  static getMetrics(
    startTime: number,
    endTime: number,
    companyId?: string
  ): QualityMetrics {
    // Filter conversations by time period and company
    const filteredConversations = Array.from(this.conversations.values()).filter(
      (conv) =>
        conv.timestamp >= startTime &&
        conv.timestamp <= endTime &&
        (!companyId || conv.companyId === companyId)
    );
    
    // Filter surveys by time period
    const filteredSurveys = Array.from(this.surveys.values()).filter(
      (survey) =>
        survey.timestamp >= startTime &&
        survey.timestamp <= endTime &&
        (!companyId || survey.companyId === companyId)
    );
    
    if (filteredConversations.length === 0) {
      return this.emptyMetrics(startTime, endTime);
    }
    
    // Calculate response time metrics
    const responseTimes = filteredConversations.map((c) => c.responseTime).sort((a, b) => a - b);
    const avgResponseTime = responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length;
    const p50ResponseTime = this.percentile(responseTimes, 0.5);
    const p95ResponseTime = this.percentile(responseTimes, 0.95);
    const p99ResponseTime = this.percentile(responseTimes, 0.99);
    
    // Calculate grounding metrics
    const groundingScores = filteredConversations.map((c) => c.groundingScore);
    const avgGroundingScore = groundingScores.reduce((sum, s) => sum + s, 0) / groundingScores.length;
    const groundingDistribution = {
      excellent: groundingScores.filter((s) => s > 90).length,
      good: groundingScores.filter((s) => s >= 70 && s <= 90).length,
      poor: groundingScores.filter((s) => s < 70).length,
    };
    
    // Calculate satisfaction metrics
    const csatRatings = filteredSurveys.map((s) => s.csatRating);
    const npsScores = filteredSurveys.map((s) => s.npsScore);
    const avgCSAT = csatRatings.length > 0
      ? csatRatings.reduce((sum, r) => sum + r, 0) / csatRatings.length
      : 0;
    const avgNPS = npsScores.length > 0
      ? npsScores.reduce((sum, s) => sum + s, 0) / npsScores.length
      : 0;
    const npsCategory = {
      promoters: npsScores.filter((s) => s >= 9).length,
      passives: npsScores.filter((s) => s >= 7 && s < 9).length,
      detractors: npsScores.filter((s) => s < 7).length,
    };
    
    // Calculate escalation metrics
    const escalationCounts = filteredConversations.map((c) => c.escalationCount);
    const avgEscalationCount = escalationCounts.reduce((sum, c) => sum + c, 0) / escalationCounts.length;
    const resolvedFirstContact = filteredConversations.filter((c) => c.resolvedFirstContact).length;
    const firstContactResolutionRate = (resolvedFirstContact / filteredConversations.length) * 100;
    const escalated = filteredConversations.filter((c) => c.escalationCount > 0).length;
    const escalationRate = (escalated / filteredConversations.length) * 100;
    
    // Calculate performance by tier
    const byTier = this.calculateTierMetrics(filteredConversations, filteredSurveys);
    
    // Calculate cache hit rate
    const cacheHits = filteredConversations.filter((c) => c.cacheHit).length;
    const cacheHitRate = (cacheHits / filteredConversations.length) * 100;
    
    return {
      avgResponseTime,
      p50ResponseTime,
      p95ResponseTime,
      p99ResponseTime,
      avgGroundingScore,
      groundingDistribution,
      avgCSAT,
      avgNPS,
      npsCategory,
      avgEscalationCount,
      firstContactResolutionRate,
      escalationRate,
      byTier,
      cacheHitRate,
      totalConversations: filteredConversations.length,
      conversationsWithRatings: filteredSurveys.length,
      startTime,
      endTime,
    };
  }
  
  /**
   * Get metrics for a specific company
   */
  static getCompanyMetrics(
    companyId: string,
    startTime: number,
    endTime: number
  ): QualityMetrics {
    return this.getMetrics(startTime, endTime, companyId);
  }
  
  /**
   * Get recent conversations with quality issues
   */
  static getQualityIssues(
    limit: number = 10,
    companyId?: string
  ): ConversationQuality[] {
    const conversations = Array.from(this.conversations.values())
      .filter((conv) => !companyId || conv.companyId === companyId)
      .filter(
        (conv) =>
          conv.groundingScore < 70 ||
          conv.escalationCount > 1 ||
          !conv.resolvedFirstContact ||
          conv.responseTime > 5000
      )
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
    
    return conversations;
  }
  
  /**
   * Get top-rated conversations
   */
  static getTopRatedConversations(
    limit: number = 10,
    companyId?: string
  ): Array<ConversationQuality & { survey?: UserSatisfactionSurvey }> {
    const conversations = Array.from(this.conversations.values())
      .filter((conv) => !companyId || conv.companyId === companyId)
      .filter((conv) => conv.userSatisfactionRating && conv.userSatisfactionRating >= 4)
      .sort((a, b) => {
        const ratingDiff = (b.userSatisfactionRating || 0) - (a.userSatisfactionRating || 0);
        if (ratingDiff !== 0) return ratingDiff;
        return b.timestamp - a.timestamp;
      })
      .slice(0, limit);
    
    // Attach survey data if available
    return conversations.map((conv) => {
      const survey = Array.from(this.surveys.values()).find(
        (s) => s.conversationId === conv.conversationId
      );
      return { ...conv, survey };
    });
  }
  
  /**
   * Export metrics for external analytics (CSV, JSON)
   */
  static exportMetrics(
    startTime: number,
    endTime: number,
    format: 'json' | 'csv' = 'json',
    companyId?: string
  ): string {
    const metrics = this.getMetrics(startTime, endTime, companyId);
    
    if (format === 'json') {
      return JSON.stringify(metrics, null, 2);
    }
    
    // CSV format
    const csvLines = [
      'Metric,Value',
      `Total Conversations,${metrics.totalConversations}`,
      `Conversations with Ratings,${metrics.conversationsWithRatings}`,
      `Avg Response Time (ms),${metrics.avgResponseTime.toFixed(2)}`,
      `P50 Response Time (ms),${metrics.p50ResponseTime.toFixed(2)}`,
      `P95 Response Time (ms),${metrics.p95ResponseTime.toFixed(2)}`,
      `P99 Response Time (ms),${metrics.p99ResponseTime.toFixed(2)}`,
      `Avg Grounding Score,${metrics.avgGroundingScore.toFixed(2)}`,
      `Grounding Excellent (>90%),${metrics.groundingDistribution.excellent}`,
      `Grounding Good (70-90%),${metrics.groundingDistribution.good}`,
      `Grounding Poor (<70%),${metrics.groundingDistribution.poor}`,
      `Avg CSAT (1-5),${metrics.avgCSAT.toFixed(2)}`,
      `Avg NPS (0-10),${metrics.avgNPS.toFixed(2)}`,
      `NPS Promoters (9-10),${metrics.npsCategory.promoters}`,
      `NPS Passives (7-8),${metrics.npsCategory.passives}`,
      `NPS Detractors (0-6),${metrics.npsCategory.detractors}`,
      `Avg Escalation Count,${metrics.avgEscalationCount.toFixed(2)}`,
      `First Contact Resolution Rate,${metrics.firstContactResolutionRate.toFixed(2)}%`,
      `Escalation Rate,${metrics.escalationRate.toFixed(2)}%`,
      `Cache Hit Rate,${metrics.cacheHitRate.toFixed(2)}%`,
    ];
    
    return csvLines.join('\n');
  }
  
  /**
   * Clear all stored data (for testing)
   */
  static clearAll(): void {
    this.conversations.clear();
    this.surveys.clear();
    console.log('[QualityTracker] All data cleared');
  }
  
  // ============================================================================
  // Private Helper Methods
  // ============================================================================
  
  private static percentile(sortedValues: number[], p: number): number {
    if (sortedValues.length === 0) return 0;
    const index = Math.ceil(sortedValues.length * p) - 1;
    return sortedValues[Math.max(0, index)];
  }
  
  private static emptyMetrics(startTime: number, endTime: number): QualityMetrics {
    return {
      avgResponseTime: 0,
      p50ResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      avgGroundingScore: 0,
      groundingDistribution: { excellent: 0, good: 0, poor: 0 },
      avgCSAT: 0,
      avgNPS: 0,
      npsCategory: { promoters: 0, passives: 0, detractors: 0 },
      avgEscalationCount: 0,
      firstContactResolutionRate: 0,
      escalationRate: 0,
      byTier: {
        L1: { count: 0, avgResponseTime: 0, avgGroundingScore: 0, avgSatisfaction: 0 },
        L2: { count: 0, avgResponseTime: 0, avgGroundingScore: 0, avgSatisfaction: 0 },
        L3: { count: 0, avgResponseTime: 0, avgGroundingScore: 0, avgSatisfaction: 0 },
      },
      cacheHitRate: 0,
      totalConversations: 0,
      conversationsWithRatings: 0,
      startTime,
      endTime,
    };
  }
  
  private static calculateTierMetrics(
    conversations: ConversationQuality[],
    surveys: UserSatisfactionSurvey[]
  ): QualityMetrics['byTier'] {
    const tiers: Tier[] = ['L1', 'L2', 'L3'];
    const result: any = {};
    
    for (const tier of tiers) {
      const tierConversations = conversations.filter((c) => c.tier === tier);
      const count = tierConversations.length;
      
      if (count === 0) {
        result[tier] = { count: 0, avgResponseTime: 0, avgGroundingScore: 0, avgSatisfaction: 0 };
        continue;
      }
      
      const avgResponseTime =
        tierConversations.reduce((sum, c) => sum + c.responseTime, 0) / count;
      const avgGroundingScore =
        tierConversations.reduce((sum, c) => sum + c.groundingScore, 0) / count;
      
      // Calculate avg satisfaction for this tier
      const tierSurveys = surveys.filter((s) =>
        tierConversations.some((c) => c.conversationId === s.conversationId)
      );
      const avgSatisfaction =
        tierSurveys.length > 0
          ? tierSurveys.reduce((sum, s) => sum + s.csatRating, 0) / tierSurveys.length
          : 0;
      
      result[tier] = { count, avgResponseTime, avgGroundingScore, avgSatisfaction };
    }
    
    return result as QualityMetrics['byTier'];
  }
}

// ============================================================================
// Persistence Layer (Firestore Integration - Ready for Implementation)
// ============================================================================

/**
 * Save conversation quality to Firestore
 * TODO: Integrate with actual Firestore SDK
 */
export async function saveConversationQuality(
  quality: ConversationQuality
): Promise<void> {
  // Placeholder for Firestore integration
  console.log('[Firestore] Saving conversation quality', quality.conversationId);
  
  // Example Firestore code:
  // const db = getFirestore();
  // await db.collection('conversation_quality').doc(quality.conversationId).set({
  //   ...quality,
  //   createdAt: new Date(quality.timestamp),
  // });
}

/**
 * Save user satisfaction survey to Firestore
 * TODO: Integrate with actual Firestore SDK
 */
export async function saveSurvey(survey: UserSatisfactionSurvey): Promise<void> {
  // Placeholder for Firestore integration
  console.log('[Firestore] Saving survey', survey.surveyId);
  
  // Example Firestore code:
  // const db = getFirestore();
  // await db.collection('user_surveys').doc(survey.surveyId).set({
  //   ...survey,
  //   createdAt: new Date(survey.timestamp),
  // });
}

/**
 * Query conversation quality metrics from Firestore
 * TODO: Integrate with actual Firestore SDK
 */
export async function queryQualityMetrics(
  companyId: string,
  startTime: number,
  endTime: number
): Promise<ConversationQuality[]> {
  // Placeholder for Firestore integration
  console.log('[Firestore] Querying quality metrics', { companyId, startTime, endTime });
  
  // Example Firestore code:
  // const db = getFirestore();
  // const snapshot = await db
  //   .collection('conversation_quality')
  //   .where('companyId', '==', companyId)
  //   .where('timestamp', '>=', startTime)
  //   .where('timestamp', '<=', endTime)
  //   .orderBy('timestamp', 'desc')
  //   .get();
  // 
  // return snapshot.docs.map(doc => doc.data() as ConversationQuality);
  
  return [];
}
