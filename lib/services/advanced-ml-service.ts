// lib/services/advanced-ml-service.ts
import { HfInference } from '@huggingface/inference';
<<<<<<< HEAD
import { pipeline, Pipeline } from '@xenova/transformers';
=======
>>>>>>> main
import { logger } from '@/lib/logger';

interface MLPrediction {
  category: string;
  confidence: number;
  reasoning: string;
  recommendedResponse: string;
}

<<<<<<< HEAD
interface TextAnalysis {
  sentiment: 'positive' | 'negative' | 'neutral';
  intent: string;
  entities: Array<{ text: string; label: string; confidence: number }>;
  keywords: string[];
  complexity: 'simple' | 'moderate' | 'complex';
=======
type Sentiment = 'positive' | 'negative' | 'neutral';
type Complexity = 'simple' | 'moderate' | 'complex';

interface TextAnalysis {
  sentiment: Sentiment;
  intent: string;
  entities: Array<{ text: string; label: string; confidence: number }>;
  keywords: string[];
  complexity: Complexity;
>>>>>>> main
}

interface EmbeddingResult {
  embedding: number[];
  model: string;
  dimensions: number;
}

function toNumberArray(x: number | number[] | number[][]): number[] {
  if (typeof x === 'number') return [x];
  if (Array.isArray(x) && typeof x[0] === 'number') return x as number[];
  return (x as number[][]).flat();
}

type TextPipe<I = string, O = unknown> = {
  run(input: I): Promise<O>;
};

export class AdvancedMLService {
<<<<<<< HEAD
  private hf: HfInference;
=======
  private readonly hf: HfInference;
>>>>>>> main
  private sentimentPipeline: TextPipe | null = null;
  private nerPipeline: TextPipe | null = null;
  private classificationPipeline: TextPipe | null = null;
  private isInitialized = false;

  constructor() {
    this.hf = new HfInference(process.env.HUGGINGFACE_API_KEY || 'hf_dummy_key');
<<<<<<< HEAD
    this.initializeModels();
=======
    // Initialize models asynchronously to avoid blocking constructor
    this.initializeModels().catch(error => {
      logger.error('Failed to initialize ML models:', error);
    });
>>>>>>> main
  }

  private async initializeModels() {
    try {
      logger.info('Initializing advanced ML models...');
      
      // Initialize models with error handling
      try {
        await this.initializeSentimentAnalysis();
      } catch (error) {
        logger.warn('Sentiment analysis model failed to load', { error });
      }
      
      try {
        await this.initializeNER();
      } catch (error) {
        logger.warn('NER model failed to load', { error });
      }
      
      try {
        await this.initializeClassification();
      } catch (error) {
        logger.warn('Classification model failed to load', { error });
      }
      
      this.isInitialized = true;
      logger.info('Advanced ML models initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize ML models', { error });
      this.isInitialized = true; // Set to true even if models fail to load
    }
  }

  private async initializeSentimentAnalysis() {
    try {
      const pipeline = await import('@xenova/transformers').then(m => m.pipeline);
      const rawPipeline = await pipeline('sentiment-analysis', 'Xenova/distilbert-base-uncased-finetuned-sst-2-english');
      this.sentimentPipeline = { run: (text: string) => rawPipeline(text) };
      logger.info('Sentiment analysis model loaded');
    } catch (error) {
      logger.warn('Sentiment analysis model not available', { error });
    }
  }

  private async initializeNER() {
    try {
      const pipeline = await import('@xenova/transformers').then(m => m.pipeline);
      const rawPipeline = await pipeline('ner', 'Xenova/xlm-roberta-base-finetuned-panx-all');
      this.nerPipeline = { run: (text: string) => rawPipeline(text) };
      logger.info('NER model loaded');
    } catch (error) {
      logger.warn('NER model not available', { error });
    }
  }

  private async initializeClassification() {
    try {
      const pipeline = await import('@xenova/transformers').then(m => m.pipeline);
      const rawPipeline = await pipeline('text-classification', 'Xenova/distilbert-base-uncased');
      this.classificationPipeline = { run: (text: string) => rawPipeline(text) };
      logger.info('Classification model loaded');
    } catch (error) {
      logger.warn('Classification model not available', { error });
    }
  }

  // Advanced text analysis using pre-trained models
  async analyzeText(text: string): Promise<TextAnalysis> {
    try {
      // Use fallback analysis if models aren't ready
      if (!this.isInitialized) {
        return this.getFallbackAnalysis(text);
      }

      const results = await Promise.allSettled([
        this.analyzeSentiment(text),
        this.extractEntities(text),
        this.classifyIntent(text),
      ]);

      const sentiment = results[0].status === 'fulfilled' ? results[0].value : 'neutral';
      const entities = results[1].status === 'fulfilled' ? results[1].value : [];
      const intent = results[2].status === 'fulfilled' ? results[2].value : 'general_inquiry';

      return {
        sentiment: sentiment as 'positive' | 'negative' | 'neutral',
        intent,
        entities,
        keywords: this.extractKeywords(text),
        complexity: this.assessComplexity(text, entities.length)
      };
    } catch (error) {
      logger.error('Text analysis failed', { error });
      return this.getFallbackAnalysis(text);
    }
  }

  private getFallbackAnalysis(text: string): TextAnalysis {
    const lowerText = text.toLowerCase();
    let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
    let intent = 'general_inquiry';
    
    // Simple sentiment detection
    if (lowerText.includes('great') || lowerText.includes('good') || lowerText.includes('excellent')) {
      sentiment = 'positive';
    } else if (lowerText.includes('bad') || lowerText.includes('terrible') || lowerText.includes('awful')) {
      sentiment = 'negative';
    }
    
    // Simple intent detection
    if (lowerText.includes('cost') || lowerText.includes('price') || lowerText.includes('expensive')) {
      intent = 'cost_inquiry';
    } else if (lowerText.includes('compare') || lowerText.includes('difference')) {
      intent = 'plan_comparison';
    } else if (lowerText.includes('recommend') || lowerText.includes('should i')) {
      intent = 'personalized_recommendation';
    }
    
    return {
      sentiment,
      intent,
      entities: [],
      keywords: this.extractKeywords(text),
      complexity: this.assessComplexity(text, 0)
    };
  }

  private async analyzeSentiment(text: string): Promise<string> {
    if (!this.sentimentPipeline) {
      return 'neutral';
    }

    try {
<<<<<<< HEAD
      const result = await this.sentimentPipeline(text);
=======
      const result = await this.sentimentPipeline.run(text);
>>>>>>> main
      return (result as any)[0]?.label?.toLowerCase() || 'neutral';
    } catch (error) {
      logger.warn('Sentiment analysis failed', { error });
      return 'neutral';
    }
  }

  private async extractEntities(text: string): Promise<Array<{ text: string; label: string; confidence: number }>> {
    if (!this.nerPipeline) {
      return [];
    }

    try {
<<<<<<< HEAD
      const result = await this.nerPipeline(text);
      return result.map((entity: any) => ({
=======
          const result = await this.nerPipeline.run(text);
      return (result as any[]).map((entity: any) => ({
>>>>>>> main
        text: entity.word,
        label: entity.entity,
        confidence: entity.score
      }));
    } catch (error) {
      logger.warn('Entity extraction failed', { error });
      return [];
    }
  }

  private async classifyIntent(text: string): Promise<string> {
    if (!this.classificationPipeline) {
      return 'general_inquiry';
    }

    try {
<<<<<<< HEAD
      const result = await this.classificationPipeline(text);
      return this.mapToIntent(result[0]?.label || 'general_inquiry');
=======
      const result = await this.classificationPipeline.run(text);
      return this.mapToIntent((result as any[])[0]?.label || 'general_inquiry');
>>>>>>> main
    } catch (error) {
      logger.warn('Intent classification failed', { error });
      return 'general_inquiry';
    }
  }

  private mapToIntent(label: string): string {
    const intentMap: Record<string, string> = {
      'LABEL_0': 'cost_inquiry',
      'LABEL_1': 'plan_comparison',
      'LABEL_2': 'coverage_question',
      'LABEL_3': 'enrollment_help',
      'LABEL_4': 'document_analysis',
      'LABEL_5': 'personalized_recommendation'
    };
    return intentMap[label] || 'general_inquiry';
  }

  private extractKeywords(text: string): string[] {
    const benefitKeywords = [
      'hsa', 'kaiser', 'dental', 'vision', 'ppo', 'hmo', 'benefits', 'plan', 'coverage',
      'cost', 'premium', 'deductible', 'copay', 'out-of-pocket', 'family', 'spouse',
      'kids', 'children', 'medication', 'prescription', 'doctor', 'specialist'
    ];
    
    const lowerText = text.toLowerCase();
    return benefitKeywords.filter(keyword => lowerText.includes(keyword));
  }

  private assessComplexity(text: string, entityCount: number): 'simple' | 'moderate' | 'complex' {
    const wordCount = text.split(' ').length;
    const questionCount = (text.match(/\?/g) || []).length;
    
    if (wordCount < 20 && entityCount < 3 && questionCount <= 1) {
      return 'simple';
    } else if (wordCount < 50 && entityCount < 5 && questionCount <= 2) {
      return 'moderate';
    } else {
      return 'complex';
    }
  }

  // Advanced embedding generation using multiple models
  async generateEmbedding(text: string, model: 'openai' | 'huggingface' = 'openai'): Promise<EmbeddingResult> {
    try {
      if (model === 'huggingface') {
        return await this.generateHuggingFaceEmbedding(text);
      } else {
        return await this.generateOpenAIEmbedding(text);
      }
    } catch (error) {
      logger.error('Embedding generation failed', { error });
      return {
        embedding: new Array(1536).fill(0),
        model: 'fallback',
        dimensions: 1536
      };
    }
  }

  private async generateHuggingFaceEmbedding(text: string): Promise<EmbeddingResult> {
    try {
      const result = await this.hf.featureExtraction({
        model: 'sentence-transformers/all-MiniLM-L6-v2',
        inputs: text,
      });
      
<<<<<<< HEAD
      return {
        embedding: Array.isArray(result) ? result[0] : result,
=======
      // Ensure we have a proper number array
      let embedding: number[];
      if (Array.isArray(result)) {
        if (Array.isArray(result[0])) {
          embedding = result[0] as number[];
        } else {
          embedding = result as number[];
        }
      } else {
        embedding = [result] as number[];
      }

      return {
        embedding,
>>>>>>> main
        model: 'sentence-transformers/all-MiniLM-L6-v2',
        dimensions: 384
      };
    } catch (error) {
      logger.warn('Hugging Face embedding failed', { error });
      throw error;
    }
  }

  private async generateOpenAIEmbedding(text: string): Promise<EmbeddingResult> {
    try {
      const { OpenAI } = await import('openai');
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY || process.env.AZURE_OPENAI_API_KEY,
        baseURL: process.env.AZURE_OPENAI_ENDPOINT || undefined,
        defaultQuery: { 'api-version': process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview' },
        defaultHeaders: {
          'api-key': process.env.OPENAI_API_KEY || process.env.AZURE_OPENAI_API_KEY,
        },
      });

      const response = await openai.embeddings.create({
        model: 'text-embedding-3-large', // Using the latest embedding model
        input: text,
      });

      return {
        embedding: response.data[0].embedding,
        model: 'text-embedding-3-large',
        dimensions: response.data[0].embedding.length
      };
    } catch (error) {
      logger.warn('OpenAI embedding failed', { error });
      throw error;
    }
  }

  // Advanced ML prediction using ensemble methods
  async predictResponseType(text: string, analysis: TextAnalysis): Promise<MLPrediction> {
    try {
      const features = this.extractFeatures(text, analysis);
      const prediction = this.ensemblePrediction(features, analysis);
      
      return {
        category: prediction.category,
        confidence: prediction.confidence,
        reasoning: prediction.reasoning,
        recommendedResponse: prediction.recommendedResponse
      };
    } catch (error) {
      logger.error('ML prediction failed', { error });
      return {
        category: 'general_inquiry',
        confidence: 0.5,
        reasoning: 'Fallback due to prediction error',
        recommendedResponse: 'pattern'
      };
    }
  }

  private extractFeatures(text: string, analysis: TextAnalysis): number[] {
    const features = [];
    
    // Text length features
    features.push(text.length / 1000); // Normalized length
    features.push((text.match(/\?/g) || []).length); // Question count
    features.push((text.match(/!/g) || []).length); // Exclamation count
    
    // Sentiment features
    features.push(analysis.sentiment === 'positive' ? 1 : 0);
    features.push(analysis.sentiment === 'negative' ? 1 : 0);
    features.push(analysis.sentiment === 'neutral' ? 1 : 0);
    
    // Entity features
    features.push(analysis.entities.length / 10); // Normalized entity count
    features.push(analysis.keywords.length / 20); // Normalized keyword count
    
    // Complexity features
    features.push(analysis.complexity === 'simple' ? 1 : 0);
    features.push(analysis.complexity === 'moderate' ? 1 : 0);
    features.push(analysis.complexity === 'complex' ? 1 : 0);
    
    // Intent features
    const intents = ['cost_inquiry', 'plan_comparison', 'coverage_question', 'enrollment_help', 'document_analysis', 'personalized_recommendation'];
    intents.forEach(intent => {
      features.push(analysis.intent === intent ? 1 : 0);
    });
    
    return features;
  }

  private ensemblePrediction(features: number[], analysis: TextAnalysis): MLPrediction {
    // Simulate ensemble prediction using multiple models
    const predictions = [
      this.ruleBasedPrediction(analysis),
      this.statisticalPrediction(features),
      this.keywordBasedPrediction(analysis.keywords)
    ];
    
    // Weighted ensemble
    const weights = [0.4, 0.3, 0.3];
    const weightedPrediction = this.combinePredictions(predictions, weights);
    
    return weightedPrediction;
  }

  private ruleBasedPrediction(analysis: TextAnalysis): MLPrediction {
    if (analysis.intent === 'cost_inquiry') {
      return {
        category: 'cost_calculation',
        confidence: 0.9,
        reasoning: 'Cost-related intent detected',
        recommendedResponse: 'cost_calculator'
      };
    }
    
    if (analysis.keywords.includes('hsa') && analysis.keywords.includes('should')) {
      return {
        category: 'personalized_recommendation',
        confidence: 0.85,
        reasoning: 'HSA recommendation request detected',
        recommendedResponse: 'personalized'
      };
    }
    
    if (analysis.keywords.includes('family') || analysis.keywords.includes('spouse')) {
      return {
        category: 'personalized_recommendation',
        confidence: 0.8,
        reasoning: 'Family-related query detected',
        recommendedResponse: 'personalized'
      };
    }
    
    return {
      category: 'general_inquiry',
      confidence: 0.6,
      reasoning: 'General inquiry pattern',
      recommendedResponse: 'pattern'
    };
  }

  private statisticalPrediction(features: number[]): MLPrediction {
    // Simulate statistical model prediction
    const costScore = features[0] * 0.3 + features[6] * 0.4 + features[7] * 0.3;
    const recommendationScore = features[1] * 0.4 + features[2] * 0.3 + features[8] * 0.3;
    
    if (costScore > 0.6) {
      return {
        category: 'cost_calculation',
        confidence: costScore,
        reasoning: 'Statistical model predicts cost inquiry',
        recommendedResponse: 'cost_calculator'
      };
    }
    
    if (recommendationScore > 0.5) {
      return {
        category: 'personalized_recommendation',
        confidence: recommendationScore,
        reasoning: 'Statistical model predicts recommendation need',
        recommendedResponse: 'personalized'
      };
    }
    
    return {
      category: 'general_inquiry',
      confidence: 0.5,
      reasoning: 'Statistical model suggests general inquiry',
      recommendedResponse: 'pattern'
    };
  }

  private keywordBasedPrediction(keywords: string[]): MLPrediction {
    const keywordWeights: Record<string, { category: string; weight: number }> = {
      'hsa': { category: 'personalized_recommendation', weight: 0.8 },
      'kaiser': { category: 'plan_comparison', weight: 0.7 },
      'family': { category: 'personalized_recommendation', weight: 0.9 },
      'cost': { category: 'cost_calculation', weight: 0.8 },
      'dental': { category: 'coverage_question', weight: 0.6 },
      'vision': { category: 'coverage_question', weight: 0.6 }
    };
    
    let bestCategory = 'general_inquiry';
    let bestConfidence = 0.5;
    let bestReasoning = 'Keyword-based analysis';
    
    for (const keyword of keywords) {
      const weight = keywordWeights[keyword];
      if (weight && weight.weight > bestConfidence) {
        bestCategory = weight.category;
        bestConfidence = weight.weight;
        bestReasoning = `Keyword '${keyword}' suggests ${weight.category}`;
      }
    }
    
    return {
      category: bestCategory,
      confidence: bestConfidence,
      reasoning: bestReasoning,
      recommendedResponse: this.getRecommendedResponse(bestCategory)
    };
  }

  private getRecommendedResponse(category: string): string {
    if (category === 'cost_calculation') return 'cost_calculator';
    if (category === 'personalized_recommendation') return 'personalized';
    return 'pattern';
  }

  private combinePredictions(predictions: MLPrediction[], weights: number[]): MLPrediction {
    const categories: Record<string, number> = {};
    const confidences: Record<string, number> = {};
    const reasonings: string[] = [];
    
    predictions.forEach((pred, index) => {
      const weight = weights[index];
      categories[pred.category] = (categories[pred.category] || 0) + weight;
      confidences[pred.category] = (confidences[pred.category] || 0) + pred.confidence * weight;
      reasonings.push(pred.reasoning);
    });
    
    const bestCategory = Object.keys(categories).reduce((a, b) => 
<<<<<<< HEAD
      categories[a] > categories[b] ? a : b
=======
      categories[a] > categories[b] ? a : b, Object.keys(categories)[0] || ''
>>>>>>> main
    );
    
    return {
      category: bestCategory,
      confidence: confidences[bestCategory] || 0.5,
      reasoning: reasonings.join('; '),
      recommendedResponse: predictions.find(p => p.category === bestCategory)?.recommendedResponse || 'pattern'
    };
  }

  // Get model status
  getModelStatus() {
    return {
      isInitialized: this.isInitialized,
      sentimentModel: !!this.sentimentPipeline,
      nerModel: !!this.nerPipeline,
      classificationModel: !!this.classificationPipeline,
      huggingFaceKey: !!process.env.HUGGINGFACE_API_KEY
    };
  }
}

export const advancedMLService = new AdvancedMLService();
