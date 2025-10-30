// lib/ai/providers.ts
import { createOpenAI } from '@ai-sdk/openai';

// Create OpenAI provider instance
const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const myProvider = {
  languageModel: (modelName: string) => openai(modelName),
};
