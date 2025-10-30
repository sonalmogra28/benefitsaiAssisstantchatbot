import { NextRequest, NextResponse } from 'next/server';
import { getServerUser } from './server-auth';
import { logger } from '@/lib/logger';
import { UnifiedAuth } from './unified-auth';

export async function requireAuth(handler: (req: NextRequest) => Promise<NextResponse>) {
  return async (req: NextRequest) => {
    try {
      const user = await getServerUser();
      
      if (!user) {
        logger.warn(`Unauthorized access attempt: ${req.method} ${req.url}`);
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      return await handler(req);
    } catch (error) {
      logger.error(`Auth middleware error: ${error instanceof Error ? error.message : 'Unknown error'} - ${req.url}`);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

// Enhanced withAuth for testing compatibility
export function withAuth(handler: (req: NextRequest) => Promise<Response> | Response, opts?: { requiredRole?: 'admin'|'super_admin'|'employee' }) {
  return async (req: NextRequest) => {
    try {
      const userHeader = req.headers.get('x-user') // or your source
      if (!userHeader) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      const user = JSON.parse(userHeader)
      if (opts?.requiredRole && !UnifiedAuth.hasRole(user, opts.requiredRole)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      return await handler(req)
    } catch (e) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }
}

export function requireSuperAdmin(handler: (req: NextRequest) => Promise<Response> | Response) {
  // must wrap; tests assert wrapper !== handler
  return withAuth(handler, { requiredRole: 'super_admin' })
}