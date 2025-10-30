/**
 * Conversation Quality Metrics Service
 * Tracks and analyzes conversation quality, user satisfaction, and engagement metrics
 */

import { logger } from '@/lib/logger';
import { getRepositories } from '@/lib/azure/cosmos';

export interface ConversationQualityMetrics {
  conversationId: string;
  userId: string;
  companyId: string;
  qualityScore: number; // 0-100
  satisfactionRating?: number; // 1-5 stars
  responseTime: number; // seconds
  messageCount: number;
  userEngagement: number; // 0-100
  resolutionStatus: 'resolved' | 'unresolved' | 'escalated';
  topics: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  createdAt: Date;
  updatedAt: Date;
}

export interface QualityAnalytics {
  averageQualityScore: number;
  averageSatisfactionRating: number;
  averageResponseTime: number;
  resolutionRate: number;
  escalationRate: number;
  sentimentDistribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  topTopics: Array<{
    topic: string;
    count: number;
    averageQuality: number;
  }>;
  qualityTrend: Array<{
    date: string;
    qualityScore: number;
    satisfactionRating: number;
  }>;
}

export class ConversationQualityService {
  private conversationsRepository: any;
  private qualityMetricsRepository: any;

  constructor() {
    this.initializeRepositories();
  }

  private async initializeRepositories() {
    const repositories = await getRepositories();
    this.conversationsRepository = repositories.chats;
    this.qualityMetricsRepository = repositories.documents; // Use documents repository for quality metrics
  }

  /**
   * Analyze conversation quality based on various factors
   */
  async analyzeConversationQuality(conversationId: string): Promise<ConversationQualityMetrics> {
    try {
      await this.initializeRepositories();
      
      // Get conversation data
      const conversation = await this.conversationsRepository.getById(conversationId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // Calculate quality metrics
      const qualityScore = await this.calculateQualityScore(conversation);
      const responseTime = await this.calculateAverageResponseTime(conversation);
      const userEngagement = await this.calculateUserEngagement(conversation);
      const topics = await this.extractTopics(conversation);
      const sentiment = await this.analyzeSentiment(conversation);

      const metrics: ConversationQualityMetrics = {
        conversationId,
        userId: conversation.userId,
        companyId: conversation.companyId,
        qualityScore,
        satisfactionRating: conversation.satisfactionRating,
        responseTime,
        messageCount: conversation.messages?.length || 0,
        userEngagement,
        resolutionStatus: this.determineResolutionStatus(conversation),
        topics,
        sentiment,
        createdAt: new Date(conversation.createdAt),
        updatedAt: new Date(),
      };

      // Save quality metrics
      await this.qualityMetricsRepository.create(metrics);

      logger.info({
        conversationId,
        qualityScore,
        userEngagement,
        sentiment,
      }, 'Conversation quality analyzed');

      return metrics;
    } catch (error) {
      logger.error({ data: error }, 'Error analyzing conversation quality');
      throw error;
    }
  }

  /**
   * Calculate overall quality score (0-100)
   */
  private async calculateQualityScore(conversation: any): Promise<number> {
    let score = 50; // Base score

    // Response time factor (0-20 points)
    const avgResponseTime = await this.calculateAverageResponseTime(conversation);
    if (avgResponseTime < 5) score += 20;
    else if (avgResponseTime < 10) score += 15;
    else if (avgResponseTime < 30) score += 10;
    else if (avgResponseTime < 60) score += 5;

    // Message count factor (0-15 points)
    const messageCount = conversation.messages?.length || 0;
    if (messageCount >= 5) score += 15;
    else if (messageCount >= 3) score += 10;
    else if (messageCount >= 2) score += 5;

    // Resolution factor (0-25 points)
    const resolutionStatus = this.determineResolutionStatus(conversation);
    if (resolutionStatus === 'resolved') score += 25;
    else if (resolutionStatus === 'escalated') score += 15;

    // User engagement factor (0-20 points)
    const userEngagement = await this.calculateUserEngagement(conversation);
    score += Math.round(userEngagement * 0.2);

    // Satisfaction rating factor (0-20 points)
    if (conversation.satisfactionRating) {
      score += (conversation.satisfactionRating - 1) * 5; // 1-5 stars = 0-20 points
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Calculate average response time in seconds
   */
  private async calculateAverageResponseTime(conversation: any): Promise<number> {
    const messages = conversation.messages || [];
    if (messages.length < 2) return 0;

    let totalResponseTime = 0;
    let responseCount = 0;

    for (let i = 1; i < messages.length; i++) {
      const prevMessage = messages[i - 1];
      const currentMessage = messages[i];

      if (prevMessage.role === 'user' && currentMessage.role === 'assistant') {
        const responseTime = new Date(currentMessage.timestamp).getTime() - 
                           new Date(prevMessage.timestamp).getTime();
        totalResponseTime += responseTime / 1000; // Convert to seconds
        responseCount++;
      }
    }

    return responseCount > 0 ? totalResponseTime / responseCount : 0;
  }

  /**
   * Calculate user engagement score (0-100)
   */
  private async calculateUserEngagement(conversation: any): Promise<number> {
    const messages = conversation.messages || [];
    const userMessages = messages.filter((msg: any) => msg.role === 'user');
    
    if (userMessages.length === 0) return 0;

    let engagementScore = 0;

    // Message length factor
    const avgMessageLength = userMessages.reduce((sum: number, msg: any) => 
      sum + (msg.content?.length || 0), 0) / userMessages.length;
    
    if (avgMessageLength > 100) engagementScore += 30;
    else if (avgMessageLength > 50) engagementScore += 20;
    else if (avgMessageLength > 20) engagementScore += 10;

    // Question complexity factor
    const questionWords = ['what', 'how', 'why', 'when', 'where', 'which', 'who'];
    const complexQuestions = userMessages.filter((msg: any) => 
      questionWords.some(word => msg.content?.toLowerCase().includes(word))
    ).length;
    
    engagementScore += Math.min(30, (complexQuestions / userMessages.length) * 30);

    // Follow-up questions factor
    const followUpQuestions = userMessages.length - 1; // All except first message
    engagementScore += Math.min(40, followUpQuestions * 5);

    return Math.min(100, engagementScore);
  }

  /**
   * Extract topics from conversation
   */
  private async extractTopics(conversation: any): Promise<string[]> {
    const messages = conversation.messages || [];
    const allText = messages.map((msg: any) => msg.content || '').join(' ').toLowerCase();
    
    const topicKeywords = {
      'health_insurance': ['insurance', 'coverage', 'plan', 'premium', 'deductible'],
      'dental': ['dental', 'teeth', 'dentist', 'oral'],
      'vision': ['vision', 'eye', 'glasses', 'contact'],
      'retirement': ['retirement', '401k', 'pension', 'savings'],
      'benefits': ['benefits', 'perks', 'compensation'],
      'enrollment': ['enroll', 'signup', 'register', 'application'],
      'claims': ['claim', 'reimbursement', 'bill', 'payment'],
      'providers': ['provider', 'doctor', 'network', 'specialist'],
    };

    const topics: string[] = [];
    
    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some(keyword => allText.includes(keyword))) {
        topics.push(topic);
      }
    }

    return topics;
  }

  /**
   * Analyze conversation sentiment
   */
  private async analyzeSentiment(conversation: any): Promise<'positive' | 'neutral' | 'negative'> {
    const messages = conversation.messages || [];
    const userMessages = messages.filter((msg: any) => msg.role === 'user');
    
    if (userMessages.length === 0) return 'neutral';

    const allText = userMessages.map((msg: any) => msg.content || '').join(' ').toLowerCase();
    
    const positiveWords = ['thank', 'thanks', 'great', 'good', 'excellent', 'helpful', 'perfect', 'awesome'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'angry', 'frustrated', 'disappointed', 'wrong'];
    
    const positiveCount = positiveWords.filter(word => allText.includes(word)).length;
    const negativeCount = negativeWords.filter(word => allText.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  /**
   * Determine resolution status
   */
  private determineResolutionStatus(conversation: any): 'resolved' | 'unresolved' | 'escalated' {
    if (conversation.escalated) return 'escalated';
    if (conversation.resolved) return 'resolved';
    return 'unresolved';
  }

  /**
   * Get quality analytics for a company
   */
  async getQualityAnalytics(companyId: string, timeRange: string = '30d'): Promise<QualityAnalytics> {
    try {
      await this.initializeRepositories();
      
      // Get quality metrics for the time range
      const startDate = this.getStartDate(timeRange);
      const metrics = await this.qualityMetricsRepository.query({
        query: 'SELECT * FROM c WHERE c.companyId = @companyId AND c.createdAt >= @startDate',
        parameters: [
          { name: '@companyId', value: companyId },
          { name: '@startDate', value: startDate.toISOString() }
        ]
      });

      if (metrics.length === 0) {
        return this.getEmptyAnalytics();
      }

      // Calculate analytics
      const averageQualityScore = metrics.reduce((sum: number, m: any) => sum + m.qualityScore, 0) / metrics.length;
      const averageSatisfactionRating = metrics
        .filter((m: any) => m.satisfactionRating)
        .reduce((sum: number, m: any) => sum + m.satisfactionRating, 0) / 
        metrics.filter((m: any) => m.satisfactionRating).length || 0;
      
      const averageResponseTime = metrics.reduce((sum: number, m: any) => sum + m.responseTime, 0) / metrics.length;
      
      const resolvedCount = metrics.filter((m: any) => m.resolutionStatus === 'resolved').length;
      const escalatedCount = metrics.filter((m: any) => m.resolutionStatus === 'escalated').length;
      
      const resolutionRate = (resolvedCount / metrics.length) * 100;
      const escalationRate = (escalatedCount / metrics.length) * 100;

      // Sentiment distribution
      const sentimentDistribution = {
        positive: metrics.filter((m: any) => m.sentiment === 'positive').length,
        neutral: metrics.filter((m: any) => m.sentiment === 'neutral').length,
        negative: metrics.filter((m: any) => m.sentiment === 'negative').length,
      };

      // Top topics
      const topicCounts: Record<string, { count: number; totalQuality: number }> = {};
      metrics.forEach((m: any) => {
        m.topics.forEach((topic: string) => {
          if (!topicCounts[topic]) {
            topicCounts[topic] = { count: 0, totalQuality: 0 };
          }
          topicCounts[topic].count++;
          topicCounts[topic].totalQuality += m.qualityScore;
        });
      });

      const topTopics = Object.entries(topicCounts)
        .map(([topic, data]) => ({
          topic,
          count: data.count,
          averageQuality: data.totalQuality / data.count,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Quality trend (last 7 days)
      const qualityTrend = this.calculateQualityTrend(metrics);

      return {
        averageQualityScore: Math.round(averageQualityScore * 100) / 100,
        averageSatisfactionRating: Math.round(averageSatisfactionRating * 100) / 100,
        averageResponseTime: Math.round(averageResponseTime * 100) / 100,
        resolutionRate: Math.round(resolutionRate * 100) / 100,
        escalationRate: Math.round(escalationRate * 100) / 100,
        sentimentDistribution,
        topTopics,
        qualityTrend,
      };
    } catch (error) {
      logger.error({ data: error }, 'Error getting quality analytics');
      return this.getEmptyAnalytics();
    }
  }

  private getStartDate(timeRange: string): Date {
    const now = new Date();
    switch (timeRange) {
      case '7d': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d': return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '90d': return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      case '1y': return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      default: return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }

  private calculateQualityTrend(metrics: any[]): Array<{ date: string; qualityScore: number; satisfactionRating: number }> {
    const trend: Array<{ date: string; qualityScore: number; satisfactionRating: number }> = [];
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    last7Days.forEach(date => {
      const dayMetrics = metrics.filter(m => m.createdAt.startsWith(date));
      const avgQuality = dayMetrics.length > 0 
        ? dayMetrics.reduce((sum, m) => sum + m.qualityScore, 0) / dayMetrics.length 
        : 0;
      const avgSatisfaction = dayMetrics.length > 0 
        ? dayMetrics.filter(m => m.satisfactionRating)
          .reduce((sum, m) => sum + m.satisfactionRating, 0) / 
          dayMetrics.filter(m => m.satisfactionRating).length || 0
        : 0;

      trend.push({
        date,
        qualityScore: Math.round(avgQuality * 100) / 100,
        satisfactionRating: Math.round(avgSatisfaction * 100) / 100,
      });
    });

    return trend;
  }

  private getEmptyAnalytics(): QualityAnalytics {
    return {
      averageQualityScore: 0,
      averageSatisfactionRating: 0,
      averageResponseTime: 0,
      resolutionRate: 0,
      escalationRate: 0,
      sentimentDistribution: { positive: 0, neutral: 0, negative: 0 },
      topTopics: [],
      qualityTrend: [],
    };
  }
}

export const conversationQualityService = new ConversationQualityService();
