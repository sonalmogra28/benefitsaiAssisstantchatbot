// lib/services/advanced-ml-service.ts
import { HfInference } from '@huggingface/inference';
import { logger } from '@/lib/logger';

interface MLPrediction {
  category: string;
  confidence: number;
  reasoning: string;
  recommendedResponse: string;
}
