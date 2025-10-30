import { NextRequest, NextResponse } from 'next/server';

import { smartChatRouter } from '@/lib/services/smart-chat-router';

import { simpleChatRouter } from '@/lib/services/simple-chat-router';

import { withAuth, PERMISSIONS } from '@/lib/auth/unified-auth';

export const POST = withAuth(undefined, [PERMISSIONS.CHAT_WITH_AI])(async (req: NextRequest) => {
  try {
    const { message, attachments } = await req.json();
    
    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Use simple routing system
    const started = Date.now();
    const response = await simpleChatRouter.routeMessage(message, attachments);
    const latencyMs = Date.now() - started;

    return NextResponse.json({
      content: response.content,
      route: response.responseType,
      cacheHit: false,
      model: 'simple',
      latencyMs,
      confidence: response.confidence
    });

  } catch (error) {
    console.error('Error in chat-demo API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
