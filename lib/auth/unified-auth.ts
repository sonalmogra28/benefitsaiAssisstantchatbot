/**
 * Unified Authentication System
 * Consolidates all authentication patterns into a single, secure system
 */

import { NextRequest, NextResponse } from 'next/server';
import { logError } from '@/lib/logger';
import { USER_ROLES } from '@/lib/constants/roles';

// Unified user interface
export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  roles: string[];
  companyId: string;
  permissions: string[];
  metadata?: Record<string, any>;
}

// Authentication result interface
export interface AuthResult {
  user: AuthenticatedUser | null;
  error: NextResponse | null;
  isAuthenticated: boolean;
}

// Role-based permissions
export const PERMISSIONS = {
  // Admin permissions
  MANAGE_USERS: 'manage_users',
  MANAGE_COMPANIES: 'manage_companies',
  MANAGE_BENEFITS: 'manage_benefits',
  VIEW_ANALYTICS: 'view_analytics',
  MANAGE_SETTINGS: 'manage_settings',
  
  // Employee permissions
  VIEW_BENEFITS: 'view_benefits',
  ENROLL_BENEFITS: 'enroll_benefits',
  CHAT_WITH_AI: 'chat_with_ai',
  VIEW_DOCUMENTS: 'view_documents',
  
  // Company admin permissions
  MANAGE_EMPLOYEES: 'manage_employees',
  VIEW_COMPANY_ANALYTICS: 'view_company_analytics',
  MANAGE_COMPANY_BENEFITS: 'manage_company_benefits',
} as const;

// Role to permissions mapping
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  [USER_ROLES.SUPER_ADMIN]: [
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.MANAGE_COMPANIES,
    PERMISSIONS.MANAGE_BENEFITS,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.MANAGE_SETTINGS,
    PERMISSIONS.MANAGE_EMPLOYEES,
    PERMISSIONS.VIEW_COMPANY_ANALYTICS,
    PERMISSIONS.MANAGE_COMPANY_BENEFITS,
  ],
  [USER_ROLES.PLATFORM_ADMIN]: [
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.MANAGE_BENEFITS,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.MANAGE_SETTINGS,
  ],
  [USER_ROLES.COMPANY_ADMIN]: [
    PERMISSIONS.MANAGE_EMPLOYEES,
    PERMISSIONS.VIEW_COMPANY_ANALYTICS,
    PERMISSIONS.MANAGE_COMPANY_BENEFITS,
    PERMISSIONS.VIEW_BENEFITS,
    PERMISSIONS.CHAT_WITH_AI,
    PERMISSIONS.VIEW_DOCUMENTS,
  ],
  [USER_ROLES.HR_ADMIN]: [
    PERMISSIONS.MANAGE_EMPLOYEES,
    PERMISSIONS.VIEW_COMPANY_ANALYTICS,
    PERMISSIONS.VIEW_BENEFITS,
    PERMISSIONS.CHAT_WITH_AI,
    PERMISSIONS.VIEW_DOCUMENTS,
  ],
  [USER_ROLES.EMPLOYEE]: [
    PERMISSIONS.VIEW_BENEFITS,
    PERMISSIONS.ENROLL_BENEFITS,
    PERMISSIONS.CHAT_WITH_AI,
    PERMISSIONS.VIEW_DOCUMENTS,
  ],
};

/**
 * Unified authentication middleware
 */
export class UnifiedAuth {
  /**
   * Authenticate request and extract user information
   */
  static async authenticateRequest(request: NextRequest): Promise<AuthResult> {
    try {
      // Extract token from Authorization header
      const authHeader = request.headers.get('authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return {
          user: null,
          error: NextResponse.json(
            { error: 'Missing or invalid authorization header' },
            { status: 401 }
          ),
          isAuthenticated: false,
        };
      }

      const token = authHeader.split('Bearer ')[1];
      
      // Validate token with Azure AD B2C
      const user = await this.validateToken(token);
      
      if (!user) {
        return {
          user: null,
          error: NextResponse.json(
            { error: 'Invalid or expired token' },
            { status: 401 }
          ),
          isAuthenticated: false,
        };
      }

      console.log('User authenticated successfully', {
        userId: user.id,
        email: user.email,
        roles: user.roles,
        companyId: user.companyId,
      });

      return {
        user,
        error: null,
        isAuthenticated: true,
      };

    } catch (error) {
      logError('Authentication failed', error);

      return {
        user: null,
        error: NextResponse.json(
          { error: 'Authentication failed' },
          { status: 401 }
        ),
        isAuthenticated: false,
      };
    }
  }

  /**
   * Validate JWT token using Azure AD B2C
   */
  private static async validateToken(token: string): Promise<AuthenticatedUser | null> {
    try {
      // Import the token validation service
      const { validateToken: validateAzureToken } = await import('@/lib/azure/token-validation');
      
      // Validate the token with Azure AD B2C
      const validationResult = await validateAzureToken(token);
      
      if (!validationResult?.valid || !validationResult.user) {
        console.warn('Token validation failed', {
          error: validationResult?.error || 'Invalid token'
        });
        return null;
      }

      const { user } = validationResult;
      
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        roles: user.roles,
        companyId: user.companyId,
        permissions: user.permissions,
        metadata: {},
      };
    } catch (error) {
      logError('Token validation failed', error);
      return null;
    }
  }

  /**
   * Check if user has specific role
   */
  static hasRole(user: AuthenticatedUser, role: string): boolean {
    const roles = user.roles ?? []
    return roles.includes(role)
  }

  /**
   * Check if user has specific permission
   */
  static hasPermission(user: AuthenticatedUser, permission: string): boolean {
    const direct = new Set(user.permissions ?? [])
    if (direct.has(permission)) return true
    // derive via roles
    for (const r of user.roles ?? []) {
      if (ROLE_PERMISSIONS[r]?.includes(permission)) return true
    }
    return false
  }

  /**
   * Check if user has any of the specified roles
   */
  static hasAnyRole(user: AuthenticatedUser, roles: string[]): boolean {
    const userRoles = new Set(user.roles ?? [])
    return roles.some(r => userRoles.has(r))
  }

  /**
   * Check if user has any of the specified permissions
   */
  static hasAnyPermission(user: AuthenticatedUser, permissions: string[]): boolean {
    return permissions.some(p => UnifiedAuth.hasPermission(user, p))
  }

  /**
   * Check if user can access company resources
   */
  static canAccessCompany(user: AuthenticatedUser, companyId: string): boolean {
    if (UnifiedAuth.hasRole(user, 'super-admin')) return true
    return !!user.companyId && user.companyId === companyId
  }

  /**
   * Get user permissions for a specific role
   */
  static getPermissionsForRole(role: string): string[] {
    const normalized = role.replace(/-/g, '_');
    const ROLE_PERMISSIONS_MAP: Record<string, string[]> = {
      employee: ['view_benefits', 'chat_with_ai'],
      admin: ['view_benefits', 'chat_with_ai', 'manage_users'],
      super_admin: ['view_benefits', 'chat_with_ai', 'manage_users', 'manage_companies'],
      platform_admin: ['manage_users', 'manage_benefits', 'view_analytics', 'manage_settings'],
      company_admin: ['manage_employees', 'view_company_analytics', 'manage_company_benefits', 'view_benefits', 'chat_with_ai', 'view_documents'],
      hr_admin: ['manage_employees', 'view_company_analytics', 'view_benefits', 'chat_with_ai', 'view_documents'],
    };

    return ROLE_PERMISSIONS_MAP[normalized] ?? [];
  }

  /**
   * Create middleware for role-based access control
   */
  static requireRole(requiredRoles: string | string[]) {
    return (user: AuthenticatedUser): boolean => {
      const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
      return this.hasAnyRole(user, roles);
    };
  }

  /**
   * Create middleware for permission-based access control
   */
  static requirePermission(requiredPermissions: string | string[]) {
    return (user: AuthenticatedUser): boolean => {
      const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
      return this.hasAnyPermission(user, permissions);
    };
  }

  /**
   * Log security events
   */
  static logSecurityEvent(
    event: string,
    details: Record<string, any>,
    user?: AuthenticatedUser
  ) {
    console.log('Security event:', {
      event,
      ...details,
      userId: user?.id,
      userEmail: user?.email,
      userRoles: user?.roles,
      timestamp: new Date().toISOString(),
    });
  }
}

// Helper to safely extract path/method from both NextRequest and plain Request
function getReqMeta(req: Request | NextRequest) {
  let path = '';
  let method = 'GET';
  try {
    const nx = (req as any).nextUrl?.pathname;
    path = nx ?? new URL((req as any).url ?? '').pathname ?? '';
  } catch {
    path = '';
  }
  method = (req as any).method ?? method;
  return { path, method };
}

// Exportable authenticator for tests to spy on; delegates to class method
export async function authenticateRequest(
  req: Request | NextRequest
): Promise<{
  user: { userId: string; email?: string; roles: string[]; companyId?: string; permissions?: string[] } | null;
  error: Response | null;
}> {
  const result = await UnifiedAuth.authenticateRequest(req as NextRequest);
  return {
    user: result.user
      ? {
          userId: result.user.id,
          email: result.user.email,
          roles: result.user.roles,
          companyId: result.user.companyId,
          permissions: result.user.permissions,
        }
      : null,
    error: (result.error as unknown as Response) ?? null,
  };
}

/**
 * Higher-order function to protect API routes
 */
export function withAuth(
  requiredRoles?: string | string[],
  requiredPermissions?: string | string[]
) {
  return function <T extends any[]>(
    handler: (request: NextRequest, ...args: T) => Promise<NextResponse>
  ) {
    return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
      // Import module dynamically and cast to any so test spies are honored at runtime
      const mod: any = await import('@/lib/auth/unified-auth');
      const { user, error } = await mod.authenticateRequest(request);
      if (error || !user) {
        return (error as unknown as NextResponse) || NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      // Map back to full AuthenticatedUser for checks
      const authUser: AuthenticatedUser = {
        id: user.userId,
        email: user.email || '',
        name: user.email || 'User',
        roles: user.roles || [],
        companyId: user.companyId || '',
        permissions: user.permissions || [],
      };
      
      // Check role requirements
      if (requiredRoles) {
        const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
        if (!UnifiedAuth.hasAnyRole(authUser, roles)) {
          const { path, method } = getReqMeta(request);
          UnifiedAuth.logSecurityEvent('Unauthorized role access attempt', {
            requiredRoles: roles,
            userRoles: authUser.roles,
            path,
            method,
          }, authUser);

          return NextResponse.json(
            { error: 'Insufficient permissions' },
            { status: 403 }
          );
        }
      }

      // Check permission requirements
      if (requiredPermissions) {
        const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
        if (!UnifiedAuth.hasAnyPermission(authUser, permissions)) {
          const { path, method } = getReqMeta(request);
          UnifiedAuth.logSecurityEvent('Unauthorized permission access attempt', {
            requiredPermissions: permissions,
            userPermissions: authUser.permissions,
            path,
            method,
          }, authUser);

          return NextResponse.json(
            { error: 'Insufficient permissions' },
            { status: 403 }
          );
        }
      }

      // Add user to request context
      const headers = new Headers(request.headers);
      headers.set('x-user-id', authUser.id);
      headers.set('x-user-email', authUser.email);
      headers.set('x-user-name', authUser.name);
      headers.set('x-user-roles', authUser.roles.join(','));
      headers.set('x-company-id', authUser.companyId);
      headers.set('x-user-permissions', authUser.permissions.join(','));

      const modifiedRequest = new NextRequest(request.url, {
        method: request.method,
        headers,
        body: request.body,
      });

      return handler(modifiedRequest, ...args);
    };
  };
}

// Convenience functions for common use cases
export const requireSuperAdmin = withAuth(USER_ROLES.SUPER_ADMIN);
export const requirePlatformAdmin = withAuth(USER_ROLES.PLATFORM_ADMIN);
export const requireCompanyAdmin = withAuth(USER_ROLES.COMPANY_ADMIN);
export const requireHRAdmin = withAuth(USER_ROLES.HR_ADMIN);
export const requireEmployee = withAuth(USER_ROLES.EMPLOYEE);

// Permission-based functions
export const requireUserManagement = withAuth(undefined, [PERMISSIONS.MANAGE_USERS]);
export const requireAnalytics = withAuth(undefined, [PERMISSIONS.VIEW_ANALYTICS]);
export const requireBenefitsManagement = withAuth(undefined, [PERMISSIONS.MANAGE_BENEFITS]);

// Legacy compatibility exports
export const withAdminAuth = requirePlatformAdmin;
export const withCompanyAdminAuth = requireCompanyAdmin;
export const withSuperAdminAuth = requireSuperAdmin;
