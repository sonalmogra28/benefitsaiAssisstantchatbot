import { NextRequest, NextResponse } from 'next/server';
import { getServerUser } from './server-auth';
import { logger } from '@/lib/logger';

export async function requireAdmin(handler: (req: NextRequest) => Promise<NextResponse>) {
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

      if (!user.roles.includes('admin') && !user.roles.includes('super-admin')) {
        logger.warn(`Insufficient permissions: ${user.id} (${user.roles.join(', ')}) ${req.url}`);
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        );
      }

      return await handler(req);
    } catch (error) {
      logger.error(`Admin middleware error: ${error instanceof Error ? error.message : 'Unknown error'} - ${req.url}`);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

// Additional exports for backward compatibility
export const requireCompanyAdmin = requireAdmin;
export const requireSuperAdmin = requireAdmin;
export const withAuth = requireAdmin;

// Legacy function exports for specific use cases
export async function withAdminAuth(handler: (req: NextRequest) => Promise<NextResponse>) {
  return requireAdmin(handler);
}

export async function withCompanyAdminAuth(handler: (req: NextRequest) => Promise<NextResponse>) {
  return requireAdmin(handler);
}
