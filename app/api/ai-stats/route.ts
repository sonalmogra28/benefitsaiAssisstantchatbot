export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

import { smartChatRouter } from '@/lib/services/smart-chat-router';


import { withAuth } from '@/lib/auth/unified-auth';
import { USER_ROLES } from '@/lib/constants/roles';

export const GET = withAuth([USER_ROLES.SUPER_ADMIN, USER_ROLES.PLATFORM_ADMIN])(async () => {
  try {
    // Simple stats for MVP
    const stats = {
      totalRequests: 0,
      averageResponseTime: 0,
      successRate: 100,
      modelUsage: { simple: 100 }
    };
    return NextResponse.json({ ok: true, ...stats });
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'stats_unavailable' }, { status: 500 });
  }
});



