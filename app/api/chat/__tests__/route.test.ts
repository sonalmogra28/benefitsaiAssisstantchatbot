// Hoisted auth/token mocks so the route sees them
vi.mock('@/lib/auth/unified-auth', () => {
  const PERMISSIONS = { CHAT_WITH_AI: 'chat_with_ai' };
  const withAuth = (_roles?: string[] | undefined, _perms?: string[] | undefined) => (handler: any) => async (req: any) => {
    // If no authorization header, simulate auth failure
    if (!req?.headers?.get?.('authorization')) {
      return new Response('Unauthorized', { status: 401 });
    }
    // simulate successful auth and attach user to request
    (req as any).user = {
      userId: 'u1',
      email: 'user@example.com',
      roles: ['employee'],
      companyId: 'c1',
    };
    return handler(req);
  };
  const authenticateRequest = vi.fn().mockResolvedValue({
    user: { userId: 'u1', roles: ['employee'], companyId: 'c1' },
    error: null,
  });
  return { PERMISSIONS, withAuth, authenticateRequest };
});

vi.mock('@/lib/azure/token-validation', () => ({
  validateToken: vi.fn().mockResolvedValue({
    valid: true,
    user: {
      id: 'u1',
      email: 'user@example.com',
      name: 'Test User',
      roles: ['employee'],
      companyId: 'c1',
      permissions: ['chat_with_ai']
    }
  }),
}));

import { describe, it, expect, vi } from 'vitest';
import { POST } from '../route';
import { NextResponse } from 'next/server';
import { streamText } from 'ai';
import { ragSystem } from '@/lib/ai/rag-system';
import * as ChatMod from '@/lib/ai/chat';
import { simpleChatRouter } from '@/lib/services/simple-chat-router';

const { mockCollection, mockDoc } = vi.hoisted(() => {
  return {
    mockCollection: vi.fn(),
    mockDoc: vi.fn(),
  };
});

vi.mock('@/lib/azure/admin', () => {
  mockCollection.mockImplementation(() => ({
    doc: (id?: string) =>
      id
        ? {
            id,
            set: vi.fn().mockResolvedValue(undefined),
            collection: mockCollection,
          }
        : { id: 'newChat', collection: mockCollection },
  }));
  mockDoc.mockImplementation(() => ({
    set: vi.fn().mockResolvedValue(undefined),
    collection: mockCollection,
  }));
  return {
    adminDb: {
      collection: mockCollection,
      doc: mockDoc,
    },
  };
});

vi.mock('azure-admin/firestore', () => ({
  Date: { serverTimestamp: vi.fn(() => new Date()) },
}));

vi.mock('@/lib/ai/rag-system', () => ({
  ragSystem: {
    search: vi
      .fn()
      .mockResolvedValue([
        { chunk: { id: 'c1', documentId: 'd1', content: 'ctx' }, score: 0.5 },
      ]),
  },
}));

vi.mock('ai', () => ({
  streamText: vi.fn().mockResolvedValue({
    toDataStreamResponse: () => new NextResponse('Test response'),
  }),
}));

describe('chat route POST', () => {
  const makeReq = (body: any = {}) =>
    new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer fake' },
      body: JSON.stringify(body),
    });
  it('returns 401 when headers missing', async () => {
    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ messages: [] }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(401);
  });

  it('returns streamed response when headers present', async () => {
    const res = await POST(makeReq({ message: 'hi', conversationId: 'conv1' }) as any);
    expect(res.status).toBe(200);
  });

  it('returns response without context when RAG empty', async () => {
    (ragSystem.search as any).mockResolvedValueOnce([]);
    const res = await POST(makeReq({ message: 'hi', conversationId: 'conv1' }) as any);
    expect(res.status).toBe(200);
  });

  it('returns 500 on internal error', async () => {
    // Force the chat layer to throw once in this spec
    vi.spyOn(simpleChatRouter as any, 'routeMessage').mockRejectedValueOnce(new Error('boom'));
    const res = await POST(makeReq({ message: 'hi', conversationId: 'conv1' }) as any);
    expect(res.status).toBe(500);
  });
});
