import type OpenAI from 'openai';
import { getOpenAIConfig } from './config';
import { logger } from '@/lib/logger';

// Lazy client initialization
let client: OpenAI | null = null;

async function getOpenAIClient(): Promise<OpenAI> {
  if (client) return client;

  const openaiConfig = getOpenAIConfig();
  const { default: OpenAIClass } = await import('openai');
  
  client = new OpenAIClass({
    apiKey: (getOpenAIConfig()).apiKey,
    baseURL: (getOpenAIConfig()).endpoint,
  });
  
  return client;
}

// Azure OpenAI service class
export class AzureOpenAIService {
  private client: OpenAI | null = null;
  
  private async ensureClient(): Promise<OpenAI> {
    if (!this.client) {
      this.client = await getOpenAIClient();
    }
    return this.client;
  }

  async generateText(
    prompt: string,
    options: {
      maxTokens?: number;
      temperature?: number;
      topP?: number;
      frequencyPenalty?: number;
      presencePenalty?: number;
      stop?: string[];
    } = {}
  ): Promise<string> {
    const client = await this.ensureClient();
    const openaiConfig = getOpenAIConfig();
    try {
      const {
        maxTokens = 1000,
        temperature = 0.7,
        topP = 0.9,
        frequencyPenalty = 0,
        presencePenalty = 0,
        stop = []
      } = options;

      const response = await client.chat.completions.create({
        model: (getOpenAIConfig()).deploymentName || 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: maxTokens,
        temperature,
        top_p: topP,
        frequency_penalty: frequencyPenalty,
        presence_penalty: presencePenalty,
        stop
      });

      const content = response.choices[0]?.message?.content || '';
      const usage = response.usage;

      logger.info({
        promptLength: prompt.length,
        responseLength: content.length,
        usage: response.usage
      }, 'Text generated successfully');

      return content;
    } catch (error) {
      logger.error('Failed to generate text', {
        promptLength: prompt.length,
        options
      }, error as Error);
      throw error;
    }
  }

  async generateChatCompletion(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options: {
      maxTokens?: number;
      temperature?: number;
      topP?: number;
      frequencyPenalty?: number;
      presencePenalty?: number;
      stop?: string[];
    } = {}
  ): Promise<{
    content: string;
    usage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
  }> {
    try {
      const {
        maxTokens = 1000,
        temperature = 0.7,
        topP = 0.9,
        frequencyPenalty = 0,
        presencePenalty = 0,
        stop = []
      } = options;

      const response = await client.chat.completions.create({
        model: (getOpenAIConfig()).deploymentName || 'gpt-3.5-turbo',
        messages: messages,
        max_tokens: maxTokens,
        temperature,
        top_p: topP,
        frequency_penalty: frequencyPenalty,
        presence_penalty: presencePenalty,
        stop
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content generated from OpenAI');
      }

      const usage = response.usage || {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0
      };

      logger.info({
        messageCount: messages.length,
        responseLength: content.length,
        usage
      }, 'Chat completion generated successfully');

      return {
        content,
        usage: {
          promptTokens: (usage as any).promptTokens || 0,
          completionTokens: (usage as any).completionTokens || 0,
          totalTokens: (usage as any).totalTokens || (usage as any).total_tokens || 0
        }
      };
    } catch (error) {
      logger.error('Failed to generate chat completion', {
        messageCount: messages.length,
        options
      }, error as Error);
      throw error;
    }
  }

  // Alias for compatibility
  async createChatCompletion(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options?: {
      maxTokens?: number;
      temperature?: number;
      topP?: number;
      frequencyPenalty?: number;
      presencePenalty?: number;
      stop?: string[];
    }
  ) {
    return this.generateChatCompletion(messages, options);
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await client.embeddings.create({
        model: (getOpenAIConfig()).embeddingDeployment,
        input: text
      });

      const embedding = response.data[0]?.embedding;
      if (!embedding) {
        throw new Error('No embedding generated');
      }

      logger.info({
        textLength: text.length,
        embeddingDimensions: embedding.length,
        usage: response.usage
      }, 'Embedding generated successfully');

      return embedding;
    } catch (error) {
      logger.error('Failed to generate embedding', {
        textLength: text.length
      }, error as Error);
      throw error;
    }
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      const response = await client.embeddings.create({
        model: (getOpenAIConfig()).embeddingDeployment,
        input: texts
      });

      const embeddings = response.data.map((item: any) => item.embedding);
      if (embeddings.length !== texts.length) {
        throw new Error('Mismatch between input texts and generated embeddings');
      }

      logger.info({
        textCount: texts.length,
        embeddingDimensions: embeddings[0]?.length || 0,
        usage: response.usage
      }, 'Embeddings generated successfully');

      return embeddings;
    } catch (error) {
      logger.error('Failed to generate embeddings', {
        textCount: texts.length
      }, error as Error);
      throw error;
    }
  }

  async streamChatCompletion(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options: {
      maxTokens?: number;
      temperature?: number;
      topP?: number;
      frequencyPenalty?: number;
      presencePenalty?: number;
      stop?: string[];
    } = {}
  ): Promise<AsyncIterable<string>> {
    try {
      const {
        maxTokens = 1000,
        temperature = 0.7,
        topP = 0.9,
        frequencyPenalty = 0,
        presencePenalty = 0,
        stop = []
      } = options;

      const stream = await client.chat.completions.create({
        model: (getOpenAIConfig()).deploymentName,
        messages,
        max_tokens: maxTokens,
        temperature,
        top_p: topP,
        frequency_penalty: frequencyPenalty,
        presence_penalty: presencePenalty,
        stop,
        stream: true
      });

      logger.info({
        messageCount: messages.length,
        options
      }, 'Chat completion stream started');

      return this.processStream(stream);
    } catch (error) {
      logger.error('Failed to start chat completion stream', {
        messageCount: messages.length,
        options
      }, error as Error);
      throw error;
    }
  }

  private async *processStream(stream: any): AsyncIterable<string> {
    try {
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }
    } catch (error) {
      logger.error('Error processing stream', {}, error as Error);
      throw error;
    }
  }

  async moderateContent(text: string): Promise<{
    flagged: boolean;
    categories: Record<string, boolean>;
    scores: Record<string, number>;
  }> {
    try {
      // Note: Azure OpenAI doesn't have a built-in moderation endpoint
      // This would typically use Azure Content Safety or a third-party service
      // For now, we'll return a basic response
      
      logger.info({
        textLength: text.length
      }, 'Content moderation check');

      return {
        flagged: false,
        categories: {
          hate: false,
          hateThreatening: false,
          selfHarm: false,
          sexual: false,
          sexualMinors: false,
          violence: false,
          violenceGraphic: false
        },
        scores: {
          hate: 0,
          hateThreatening: 0,
          selfHarm: 0,
          sexual: 0,
          sexualMinors: 0,
          violence: 0,
          violenceGraphic: 0
        }
      };
    } catch (error) {
      logger.error('Failed to moderate content', {
        textLength: text.length
      }, error as Error);
      throw error;
    }
  }

  async getModels(): Promise<Array<{ id: string; object: string; created: number; ownedBy: string }>> {
    try {
      // Note: Azure OpenAI doesn't expose the same models endpoint as OpenAI
      // This would typically return the available deployments
      
      logger.info({}, 'Models requested');

      return [
        {
          id: (getOpenAIConfig()).deploymentName,
          object: 'model',
          created: Date.now(),
          ownedBy: 'azure'
        }
      ];
    } catch (error) {
      logger.error('Failed to get models', {}, error as Error);
      throw error;
    }
  }
}

// Create service instance
export const azureOpenAIService = new AzureOpenAIService();

// Export the client getter for advanced operations
export { getOpenAIClient };

