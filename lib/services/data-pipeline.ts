// lib/services/data-pipeline.ts
import { logger } from '@/lib/logger';
import { embeddingsRouter } from './embeddings-router';
import { reasoningEngine } from './reasoning-engine';
import { langChainProcessor } from './langchain-processor';
import { mlAnalytics } from './ml-analytics';
import { vectorSearchService } from './vector-search';
import { textProcessor } from './text-processor';
import { mlTrainer } from './ml-trainer';

interface DocumentAnalysisPipeline {
  documentId: string;
  fileName: string;
  content: string;
  embeddings: number[];
  textAnalysis: any;
  extractedEntities: any[];
  summary: string;
  keyPoints: string[];
  recommendations: string[];
  confidence: number;
  processingTime: number;
      // Step 6: Document Analysis (ML analysis moved to user-specific processing)
      const documentAnalysis = {
        contentLength: documentContent.length,
        hasCosts: documentContent.toLowerCase().includes('cost') || documentContent.toLowerCase().includes('premium'),
        hasCoverage: documentContent.toLowerCase().includes('coverage') || documentContent.toLowerCase().includes('benefits'),
        documentType: this.classifyDocumentType(fileName, documentContent)
      };

      const endTime = process.hrtime.bigint();
      const processingTime = Number(endTime - startTime) / 1_000_000;

      const pipeline: DocumentAnalysisPipeline = {
        documentId: this.generateDocumentId(fileName),
        fileName,
        content: documentContent,
        embeddings,
        textAnalysis,
        extractedEntities,
        summary: langChainAnalysis.summary,
        keyPoints: langChainAnalysis.keyPoints,
        recommendations: langChainAnalysis.recommendations,
        confidence: langChainAnalysis.confidence,
        processingTime,
        vectorSearchResults.results
      );

      const endTime = process.hrtime.bigint();
      const processingTime = Number(endTime - startTime) / 1_000_000;

      const pipeline: PersonalizedRecommendationPipeline = {
        userProfile,
        query,
        embeddings,
        textAnalysis,
        mlAnalysis,
        vectorSearchResults: vectorSearchResults.results,
        recommendations,
        confidence: reasoningResult.confidence,
        processingTime,
      };

      logger.info(`Personalized recommendation pipeline complete. Processing time: ${processingTime}ms`);
      return pipeline;

    } catch (error) {
      logger.error('Personalized recommendation pipeline failed', { error });
      throw error;
    }
  }

  // HELPER METHODS
  private extractEntities(text: string): any[] {
    const entities: any[] = [];
    
    // Extract plan types
    const planTypes = ['HSA', 'Kaiser', 'PPO', 'HMO', 'DHMO', 'DPPO'];
    planTypes.forEach(plan => {
      if (text.toLowerCase().includes(plan.toLowerCase())) {
        entities.push({ type: 'plan_type', value: plan, confidence: 0.9 });
      }
    });
    
    // Extract costs
    const costRegex = /\$[\d,]+(?:\.\d{2})?/g;
    const costs = text.match(costRegex);
    if (costs) {
      costs.forEach(cost => {
        entities.push({ type: 'cost', value: cost, confidence: 0.8 });
      });
    }
    
    // Extract percentages
    const percentRegex = /\d+(?:\.\d+)?%/g;
    const percentages = text.match(percentRegex);
    if (percentages) {
      percentages.forEach(percent => {
        entities.push({ type: 'percentage', value: percent, confidence: 0.8 });
      });
    }
    
    return entities;
  }

  private classifyDocumentType(fileName: string, content: string): string {
    const lowerFileName = fileName.toLowerCase();
    const lowerContent = content.toLowerCase();
    
    if (lowerFileName.includes('kaiser') || lowerContent.includes('kaiser')) {
      return 'kaiser_plan';
    } else if (lowerFileName.includes('hsa') || lowerContent.includes('health savings')) {
      return 'hsa_plan';
    } else if (lowerFileName.includes('dental') || lowerContent.includes('dental')) {
      return 'dental_plan';
    } else if (lowerFileName.includes('vision') || lowerContent.includes('vision')) {
      return 'vision_plan';
    } else if (lowerContent.includes('summary') || lowerContent.includes('overview')) {
      return 'benefits_summary';
    } else {
      return 'general_benefits';
    }
  }

  private generateDocumentId(fileName: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `doc_${timestamp}_${random}`;
  }

  private async predictOptimalPlan(userProfile: any, planData: any[], embeddings: number[]): Promise<any> {
    // Use ML models to predict the best plan
    const features = this.extractUserFeatures(userProfile, embeddings);
    
    // Simulate ML prediction (in real implementation, use trained model)
    const predictions = planData.map(plan => ({
      planId: plan.id,
      planName: plan.name,
      score: Math.random() * 0.4 + 0.6, // Simulate confidence between 0.6-1.0
      reasoning: this.generatePlanReasoning(userProfile, plan),
      confidence: Math.random() * 0.2 + 0.8
    }));
    
    // Sort by score and return top recommendation
    predictions.sort((a, b) => b.score - a.score);
    return predictions[0];
  }

  private extractUserFeatures(userProfile: any, embeddings: number[]): number[] {
    const features = [];
    
    // Add user profile features
    features.push(userProfile.age || 0);
    features.push(userProfile.familySize || 1);
    features.push(userProfile.healthUsage === 'high' ? 1 : 0);
    features.push(userProfile.riskTolerance === 'aggressive' ? 1 : 0);
    
    // Add embedding features (first 10 dimensions)
    features.push(...embeddings.slice(0, 10));
    
    return features;
  }

  private generatePlanReasoning(userProfile: any, plan: any): string {
    const reasons = [];
    
    if (userProfile.age < 35 && plan.type === 'HSA') {
      reasons.push('Good for young, healthy individuals due to tax advantages');
    }
    if (userProfile.familySize > 1 && (plan.type === 'HMO' || plan.type === 'PPO')) {
      reasons.push('Suitable for families needing comprehensive coverage');
    }
    if (userProfile.healthUsage === 'high' && plan.deductible === 0) {
      reasons.push('No deductible plans ideal for high healthcare usage');
    }
    
    return reasons.join('; ') || 'General fit based on profile';
  }

  private async calculateDetailedCosts(userProfile: any, planData: any[], prediction: any): Promise<any> {
    const selectedPlan = planData.find(p => p.id === prediction.planId);
    if (!selectedPlan) return null;
    
    // Calculate annual costs
    const annualPremium = selectedPlan.premium * 12;
    const estimatedUsage = this.estimateUsage(userProfile);
    const outOfPocketCosts = this.calculateOutOfPocket(selectedPlan, estimatedUsage);
    
    return {
      planName: selectedPlan.name,
      annualPremium,
      estimatedUsage,
      outOfPocketCosts,
      totalAnnualCost: annualPremium + outOfPocketCosts,
      monthlyCost: (annualPremium + outOfPocketCosts) / 12,
      breakdown: {
        premiums: annualPremium,
        deductibles: selectedPlan.deductible,
        copays: outOfPocketCosts,
        maxOutOfPocket: selectedPlan.outOfPocketMax
      }
    };
  }

  private estimateUsage(userProfile: any): any {
    const baseVisits = {
      low: { doctor: 1, specialist: 0, emergency: 0 },
      moderate: { doctor: 3, specialist: 1, emergency: 0 },
      high: { doctor: 6, specialist: 3, emergency: 1 }
    };
    
    const healthUsage = userProfile.healthUsage as keyof typeof baseVisits;
    return baseVisits[healthUsage] || baseVisits.moderate;
  }

  private calculateOutOfPocket(plan: any, usage: any): number {
    let total = 0;
    
    if (plan.deductible > 0) {
      total += plan.deductible; // Assume deductible is met
    }
    
    if (plan.copay > 0) {
      total += (usage.doctor * plan.copay) + (usage.specialist * plan.copay * 1.5);
    }
    
    return Math.min(total, plan.outOfPocketMax || total);
  }

  private async generateCostRecommendations(userProfile: any, costBreakdown: any, mlAnalysis: any): Promise<any[]> {
    const recommendations = [];
    
    if (costBreakdown.totalAnnualCost > userProfile.budget) {
      recommendations.push({
        type: 'budget_concern',
        message: 'Consider a plan with lower premiums or higher deductibles to fit your budget',
        priority: 'high'
      });
    }
    
    if (userProfile.healthUsage === 'low' && costBreakdown.breakdown.premiums > costBreakdown.breakdown.copays) {
      recommendations.push({
        type: 'usage_optimization',
        message: 'HSA plan might be better for your low healthcare usage pattern',
        priority: 'medium'
      });
    }
    
    return recommendations;
  }

  private async generatePersonalizedRecommendations(
    userProfile: any,
    query: string,
    textAnalysis: any,
    mlAnalysis: any,
    vectorSearchResults: any[]
  ): Promise<any[]> {
    const recommendations = [];
    
    // Based on ML analysis
    if (mlAnalysis.recommendations) {
      recommendations.push(...mlAnalysis.recommendations.map((rec: any) => ({
        type: 'ml_recommendation',
        content: rec.reasoning,
        confidence: rec.score,
        source: 'ml_analysis'
      })));
    }
    
    // Based on similar cases from vector search
    if (vectorSearchResults.length > 0) {
      recommendations.push({
        type: 'similar_case',
        content: `Based on similar cases, ${vectorSearchResults[0].content.substring(0, 100)}...`,
        confidence: vectorSearchResults[0].score,
        source: 'vector_search'
      });
    }
    
    // Based on text analysis
    if (textAnalysis.categories.includes('cost_inquiry')) {
      recommendations.push({
        type: 'cost_focused',
        content: 'Focus on comparing total annual costs including premiums, deductibles, and out-of-pocket expenses',
        confidence: 0.8,
        source: 'text_analysis'
      });
    }
    
    return recommendations;
  }
}

export const dataPipelineService = new DataPipelineService();
