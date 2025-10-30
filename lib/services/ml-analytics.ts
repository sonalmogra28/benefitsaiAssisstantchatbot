// lib/services/ml-analytics.ts
import { logger } from '@/lib/logger';

interface UserProfile {
  age?: number;
  familySize?: number;
  income?: string;
  healthStatus?: string;
  planType?: string;
  satisfaction?: number;
  claimsCount?: number;
  totalCost?: number;
}

interface PlanRecommendation {
  planName: string;
  score: number;
  reasoning: string[];
  estimatedCost: number;
  benefits: string[];
}

interface AnalyticsResult {
  recommendations: PlanRecommendation[];
  insights: string[];
  confidence: number;
  processingTime: number;
}

export class MLAnalytics {
  private userProfiles: UserProfile[] = [];
  private planData: any[] = [];
  private isInitialized = false;

  constructor() {
    this.initializeData();
  }

  private initializeData() {
    // Simulate user profile data for ML training
    this.userProfiles = [
      { age: 25, familySize: 1, income: 'low', healthStatus: 'healthy', planType: 'HSA', satisfaction: 8, claimsCount: 2, totalCost: 1200 },
      { age: 35, familySize: 3, income: 'medium', healthStatus: 'healthy', planType: 'HMO', satisfaction: 9, claimsCount: 5, totalCost: 2400 },
      { age: 45, familySize: 2, income: 'high', healthStatus: 'chronic', planType: 'PPO', satisfaction: 7, claimsCount: 12, totalCost: 4800 },
      { age: 28, familySize: 1, income: 'medium', healthStatus: 'healthy', planType: 'HSA', satisfaction: 9, claimsCount: 1, totalCost: 800 },
      { age: 52, familySize: 4, income: 'high', healthStatus: 'chronic', planType: 'HMO', satisfaction: 8, claimsCount: 8, totalCost: 3600 },
      { age: 30, familySize: 2, income: 'medium', healthStatus: 'healthy', planType: 'PPO', satisfaction: 6, claimsCount: 3, totalCost: 1800 },
    ];

    // Simulate plan data
    this.planData = [
      { name: 'HSA Standard', deductible: 3500, premium: 200, coverage: 0.8, network: 'broad', hsaEligible: true },
      { name: 'HSA Enhanced', deductible: 2000, premium: 300, coverage: 0.85, network: 'broad', hsaEligible: true },
      { name: 'HMO Standard', deductible: 500, premium: 400, coverage: 0.9, network: 'narrow', hsaEligible: false },
      { name: 'HMO Enhanced', deductible: 250, premium: 500, coverage: 0.95, network: 'narrow', hsaEligible: false },
      { name: 'PPO', deductible: 1000, premium: 600, coverage: 0.8, network: 'broad', hsaEligible: false },
    ];

    this.isInitialized = true;
    logger.info('ML Analytics initialized with sample data');
  }

  async analyzeUserProfile(userProfile: UserProfile): Promise<AnalyticsResult> {
    const startTime = Date.now();
    
    try {
      if (!this.isInitialized) {
        this.initializeData();
      }

      // Simulate ML analysis using statistical methods
      const recommendations = await this.generatePlanRecommendations(userProfile);
      const insights = this.generateInsights(userProfile);
      const processingTime = Date.now() - startTime;

      return {
        recommendations,
        insights,
        confidence: this.calculateConfidence(userProfile),
        processingTime,
      };
    } catch (error) {
      logger.error('ML Analytics failed', { error });
      return this.getFallbackResult();
    }
  }

  private async generatePlanRecommendations(userProfile: UserProfile): Promise<PlanRecommendation[]> {
    const recommendations: PlanRecommendation[] = [];

    for (const plan of this.planData) {
      const score = this.calculatePlanScore(userProfile, plan);
      const reasoning = this.generateReasoning(userProfile, plan);
      const estimatedCost = this.estimateCost(userProfile, plan);

      if (score > 0.3) { // Only recommend plans with reasonable scores
        recommendations.push({
          planName: plan.name,
          score,
          reasoning,
          estimatedCost,
          benefits: this.extractBenefits(plan),
        });
      }
    }

    // Sort by score (highest first)
    return recommendations.sort((a, b) => b.score - a.score).slice(0, 3);
  }

  private calculatePlanScore(userProfile: UserProfile, plan: any): number {
    let score = 0.5; // Base score

    // Age factor
    if (userProfile.age) {
      if (userProfile.age < 30 && plan.hsaEligible) {
        score += 0.2; // Young people benefit from HSA
      } else if (userProfile.age > 40 && plan.coverage > 0.9) {
        score += 0.15; // Older people need better coverage
      }
    }

    // Family size factor
    if (userProfile.familySize) {
      if (userProfile.familySize > 2 && plan.network === 'broad') {
        score += 0.1; // Families need broader networks
      }
    }

    // Health status factor
    if (userProfile.healthStatus === 'chronic' && plan.coverage > 0.85) {
      score += 0.2; // Chronic conditions need better coverage
    } else if (userProfile.healthStatus === 'healthy' && plan.hsaEligible) {
      score += 0.15; // Healthy people can benefit from HSA
    }

    // Income factor
    if (userProfile.income === 'low' && plan.premium < 400) {
      score += 0.1; // Lower income prefers lower premiums
    } else if (userProfile.income === 'high' && plan.coverage > 0.9) {
      score += 0.1; // Higher income can afford better coverage
    }

    return Math.min(1.0, Math.max(0.0, score));
  }

  private generateReasoning(userProfile: UserProfile, plan: any): string[] {
    const reasoning: string[] = [];

    if (userProfile.age && userProfile.age < 30 && plan.hsaEligible) {
      reasoning.push('Young age makes HSA tax benefits valuable');
    }

    if (userProfile.healthStatus === 'chronic' && plan.coverage > 0.85) {
      reasoning.push('Chronic conditions require comprehensive coverage');
    }

    if (userProfile.familySize && userProfile.familySize > 2 && plan.network === 'broad') {
      reasoning.push('Large family benefits from broader provider network');
    }

    if (userProfile.income === 'low' && plan.premium < 400) {
      reasoning.push('Lower premium fits budget constraints');
    }

    if (plan.hsaEligible && userProfile.healthStatus === 'healthy') {
      reasoning.push('HSA allows tax-free savings for future healthcare needs');
    }

    return reasoning.length > 0 ? reasoning : ['General suitability based on profile'];
  }

  private estimateCost(userProfile: UserProfile, plan: any): number {
    const baseCost = plan.premium * 12; // Annual premium
    const familyMultiplier = userProfile.familySize ? Math.max(1, userProfile.familySize * 0.8) : 1;
    
    // Estimate out-of-pocket costs based on health status
    let estimatedOOP = 0;
    if (userProfile.healthStatus === 'healthy') {
      estimatedOOP = plan.deductible * 0.3; // Healthy people use less
    } else if (userProfile.healthStatus === 'chronic') {
      estimatedOOP = plan.deductible * 1.2; // Chronic conditions use more
    } else {
      estimatedOOP = plan.deductible * 0.6; // Average usage
    }

    return Math.round((baseCost + estimatedOOP) * familyMultiplier);
  }

  private extractBenefits(plan: any): string[] {
    const benefits: string[] = [];
    
    if (plan.hsaEligible) {
      benefits.push('HSA tax advantages');
    }
    
    if (plan.coverage > 0.9) {
      benefits.push('High coverage percentage');
    }
    
    if (plan.network === 'broad') {
      benefits.push('Broad provider network');
    }
    
    if (plan.deductible < 1000) {
      benefits.push('Low deductible');
    }

    return benefits;
  }

  private generateInsights(userProfile: UserProfile): string[] {
    const insights: string[] = [];

    if (userProfile.age && userProfile.age < 30) {
      insights.push('Consider HSA plans for long-term tax benefits');
    }

    if (userProfile.familySize && userProfile.familySize > 2) {
      insights.push('Family plans may offer better value per person');
    }

    if (userProfile.healthStatus === 'chronic') {
      insights.push('Prioritize plans with low deductibles and high coverage');
    }

    if (userProfile.income === 'low') {
      insights.push('Look for plans with lower premiums and good preventive care coverage');
    }

    return insights;
  }

  private calculateConfidence(userProfile: UserProfile): number {
    let confidence = 0.5; // Base confidence

    // More data points = higher confidence
    const dataPoints = Object.values(userProfile).filter(v => v !== undefined).length;
    confidence += dataPoints * 0.1;

    // Age and health status are key factors
    if (userProfile.age && userProfile.healthStatus) {
      confidence += 0.2;
    }

    return Math.min(1.0, confidence);
  }

  private getFallbackResult(): AnalyticsResult {
    return {
      recommendations: [
        {
          planName: 'HMO Standard',
          score: 0.6,
          reasoning: ['General recommendation', 'Balanced coverage'],
          estimatedCost: 3000,
          benefits: ['Standard coverage', 'Network providers'],
        },
      ],
      insights: ['Consider your specific healthcare needs', 'Compare costs carefully'],
      confidence: 0.5,
      processingTime: 50,
    };
  }

  // Advanced analytics methods
  async performCohortAnalysis(userProfiles: UserProfile[]): Promise<any> {
    const cohorts = {
      young: userProfiles.filter(p => p.age && p.age < 30),
      middle: userProfiles.filter(p => p.age && p.age >= 30 && p.age < 50),
      senior: userProfiles.filter(p => p.age && p.age >= 50),
    };

    return {
      young: this.analyzeCohort(cohorts.young, 'Young Adults'),
      middle: this.analyzeCohort(cohorts.middle, 'Middle Age'),
      senior: this.analyzeCohort(cohorts.senior, 'Senior'),
    };
  }

  private analyzeCohort(profiles: UserProfile[], name: string): any {
    if (profiles.length === 0) return { name, count: 0 };

    const avgSatisfaction = profiles.reduce((sum, p) => sum + (p.satisfaction || 0), 0) / profiles.length;
    const avgCost = profiles.reduce((sum, p) => sum + (p.totalCost || 0), 0) / profiles.length;
    const popularPlan = this.findMostPopularPlan(profiles);

    return {
      name,
      count: profiles.length,
      avgSatisfaction: Math.round(avgSatisfaction * 10) / 10,
      avgCost: Math.round(avgCost),
      popularPlan,
    };
  }

  private findMostPopularPlan(profiles: UserProfile[]): string {
    const planCounts: { [key: string]: number } = {};
    
    profiles.forEach(p => {
      if (p.planType) {
        planCounts[p.planType] = (planCounts[p.planType] || 0) + 1;
      }
    });

    return Object.entries(planCounts).reduce((a, b) => planCounts[a[0]] > planCounts[b[0]] ? a : b)[0];
  }
}

export const mlAnalytics = new MLAnalytics();
