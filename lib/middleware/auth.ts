import { NextRequest, NextResponse } from 'next/server';
import { getServerUser } from '@/lib/auth/server-auth';
import { logger } from '@/lib/logger';

export interface AuthContext {
  user: {
    id: string;
    email: string;
    role: string;
    companyId?: string;
  };
  isAuthenticated: boolean;
}

export async function withAuth(
  handler: (req: NextRequest, context: AuthContext) => Promise<NextResponse>,
  options: {
    requiredRole?: string;
    requireCompanyId?: boolean;
  } = {}
) {
  return async (req: NextRequest) => {
    try {
      const user = await getServerUser();
      
      if (!user) {
        logger.warn({
          url: req.url,
          method: req.method,
        }, 'Unauthorized access attempt');
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      const authContext: AuthContext = {
        user: {
          id: user.id,
          email: user.email,
          role: user.roles[0] || 'user',
          companyId: user.companyId,
        },
        isAuthenticated: true,
      };

      // Check role requirements
      if (options.requiredRole && authContext.user.role !== options.requiredRole) {
        logger.warn({
          userId: authContext.user.id,
          requiredRole: options.requiredRole,
          userRole: authContext.user.role,
        }, 'Insufficient permissions');
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        );
      }

      // Check company ID requirements
      if (options.requireCompanyId && !authContext.user.companyId) {
        logger.warn({
          userId: authContext.user.id,
        }, 'Company ID required but not provided');
        return NextResponse.json(
          { error: 'Company ID required' },
          { status: 400 }
        );
      }

      return await handler(req, authContext);
    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : 'Unknown error',
        url: req.url,
      }, 'Auth middleware error');
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

export function requireAuth(requiredRole?: string, requireCompanyId?: boolean) {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;
    
    descriptor.value = withAuth(originalMethod, {
      requiredRole,
      requireCompanyId,
    });
    
    return descriptor;
  };
}

// Legacy function exports for backward compatibility
export async function protectAdminEndpoint(req: NextRequest) {
  const user = await getServerUser();
  
  if (!user) {
    return { user: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  if (!user.roles.includes('admin') && !user.roles.includes('super-admin')) {
    return { user: null, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { user, error: null };
}

export async function protectSuperAdminEndpoint(req: NextRequest) {
  const user = await getServerUser();
  
  if (!user) {
    return { user: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  if (!user.roles.includes('super-admin')) {
    return { user: null, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { user, error: null };
}

export async function protectCompanyEndpoint(req: NextRequest) {
  const user = await getServerUser();
  
  if (!user) {
    return { user: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  if (!user.companyId) {
    return { user: null, error: NextResponse.json({ error: 'Company ID required' }, { status: 400 }) };
  }

  return { user, error: null };
}
