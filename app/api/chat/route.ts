import { NextRequest, NextResponse } from 'next/server';
import { withAuth, PERMISSIONS } from '@/lib/auth/unified-auth';

import { smartChatRouter } from '@/lib/services/smart-chat-router';

import { simpleChatRouter } from '@/lib/services/simple-chat-router';

import { conversationService } from '@/lib/services/conversation-service';
import { logger } from '@/lib/logger';
import { z } from 'zod';

// Validation schema for chat request
const chatRequestSchema = z.object({
  message: z.string().min(1, 'Message is required'),
  conversationId: z.string().optional(),
  context: z.record(z.any()).optional(),
});

export const POST = withAuth(undefined, [PERMISSIONS.CHAT_WITH_AI])(async (request: NextRequest) => {
  try {
    // Extract user context injected by withAuth
    const userId = request.headers.get('x-user-id')!;
    const companyId = request.headers.get('x-company-id')!;

    const body = await request.json();
    const { message, conversationId } = chatRequestSchema.parse(body);

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Create user message object
    const userMessage = {
      id: crypto.randomUUID(),
      role: 'user' as const,
      content: message,
      timestamp: new Date(),
      userId: userId
    };

    // Get or create conversation
    let conversation = conversationId 
      ? await conversationService.getConversation(conversationId)
      : null;

    conversation ??= await conversationService.createConversation(
      userId,
      companyId
    );

    // Save user message to conversation
    await conversationService.addMessage(conversation.id, userMessage);

    // Route via SimpleChatRouter
    const started = Date.now();
    const routed = await simpleChatRouter.routeMessage(userMessage.content);
    const latencyMs = Date.now() - started;

    // Save AI response
    const aiMessage = {
      id: crypto.randomUUID(),
      role: 'assistant' as const,
      content: routed.content,
      timestamp: new Date()
    };

    await conversationService.addMessage(conversation.id, aiMessage);

    return NextResponse.json({
      message: aiMessage,
      conversationId: conversation.id,
      route: routed.responseType,
      model: 'simple',
      latencyMs
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    logger.error('Chat error', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Chat processing failed' }, { status: 500 });
  }
});
