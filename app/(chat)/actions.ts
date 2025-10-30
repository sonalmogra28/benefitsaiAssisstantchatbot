'use server';

import { generateText, type UIMessage } from 'ai';
import { cookies } from 'next/headers';
import type { VisibilityType } from '@/components/visibility-selector';
// import { myProvider } from '@/lib/ai/providers'; // Removed - using Azure OpenAI directly
import { logger } from '@/lib/logger';

export async function saveChatModelAsCookie(model: string) {
  const cookieStore = await cookies();
  cookieStore.set('chat-model', model);
}

export async function generateTitleFromUserMessage({
  message,
}: {
  message: UIMessage;
}) {
  // TODO: Implement with Azure OpenAI
  // For now, return a simple title based on the message content
  const messageText = typeof message.content === 'string' ? message.content : JSON.stringify(message.content);
  const title = messageText.substring(0, 80).trim();

  return title;
}

export async function deleteTrailingMessages({ id }: { id: string }) {
  logger.warn('deleteTrailingMessages is not implemented');
}

export async function updateChatVisibility({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: VisibilityType;
}) {
  logger.warn('updateChatVisibility is not implemented');
}
