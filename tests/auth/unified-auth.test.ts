/**
 * Unified Auth Tests
 * Comprehensive test suite for authentication system
 */

import { describe, it, expect, vi } from 'vitest';
import { UnifiedAuth, withAuth, requireSuperAdmin } from '@/lib/auth/unified-auth';
import * as UnifiedAuthNS from '@/lib/auth/unified-auth';
import { createMockUser } from '../setup';

describe('UnifiedAuth', () => {
  describe('hasRole', () => {
    it('returns true when user has the role', () => {
      const user = createMockUser({ roles: ['employee', 'admin'] });
      expect(UnifiedAuth.hasRole(user as any, 'employee')).toBe(true);
      expect(UnifiedAuth.hasRole(user as any, 'admin')).toBe(true);
    });
    it('returns false when user lacks the role', () => {
      const user = createMockUser({ roles: ['employee'] });
      expect(UnifiedAuth.hasRole(user as any, 'admin')).toBe(false);
    });
  });

  describe('hasPermission', () => {
    it('returns true for direct permission', () => {
      const user = createMockUser({ permissions: ['view_benefits', 'chat_with_ai'] });
      expect(UnifiedAuth.hasPermission(user as any, 'view_benefits')).toBe(true);
    });
    it('returns false when permission missing', () => {
      const user = createMockUser({ permissions: ['view_benefits'] });
      expect(UnifiedAuth.hasPermission(user as any, 'manage_users')).toBe(false);
    });
  });

  describe('hasAnyRole', () => {
    it('true when any role present', () => {
      const user = createMockUser({ roles: ['employee'] });
      expect(UnifiedAuth.hasAnyRole(user as any, ['admin', 'employee'])).toBe(true);
    });
    it('false when none present', () => {
      const user = createMockUser({ roles: ['employee'] });
      expect(UnifiedAuth.hasAnyRole(user as any, ['admin', 'super_admin'])).toBe(false);
    });
  });

  describe('hasAnyPermission', () => {
    it('true when any permission present', () => {
      const user = createMockUser({ permissions: ['view_benefits'] });
      expect(UnifiedAuth.hasAnyPermission(user as any, ['view_benefits', 'manage_users'])).toBe(true);
    });
    it('false when none present', () => {
      const user = createMockUser({ permissions: ['view_benefits'] });
      expect(UnifiedAuth.hasAnyPermission(user as any, ['manage_users', 'manage_companies'])).toBe(false);
    });
  });

  describe('canAccessCompany', () => {
    it('true for super admin', () => {
      const user = createMockUser({ roles: ['super-admin'], companyId: 'c1' });
      expect(UnifiedAuth.canAccessCompany(user as any, 'c2')).toBe(true);
    });
    it('true for own company', () => {
      const user = createMockUser({ companyId: 'c1' });
      expect(UnifiedAuth.canAccessCompany(user as any, 'c1')).toBe(true);
    });
    it('false for other company', () => {
      const user = createMockUser({ companyId: 'c1' });
      expect(UnifiedAuth.canAccessCompany(user as any, 'c2')).toBe(false);
    });
  });

  describe('getPermissionsForRole', () => {
    it('employee includes benefits and chat', () => {
      const permissions = UnifiedAuth.getPermissionsForRole('employee');
      expect(permissions).toContain('view_benefits');
      expect(permissions).toContain('chat_with_ai');
    });
    it('super_admin includes manage', () => {
      const permissions = UnifiedAuth.getPermissionsForRole('super-admin');
      expect(permissions).toContain('manage_users');
      expect(permissions).toContain('manage_companies');
    });
    it('unknown returns empty', () => {
      expect(UnifiedAuth.getPermissionsForRole('unknown_role')).toEqual([]);
    });
  });
});

describe('withAuth middleware', () => {
  it('calls handler when authentication succeeds', async () => {
    const handler = vi.fn(async () => new Response('ok', { status: 200 }));
    const protectedHandler = withAuth(['admin'])(handler) as any;

    vi.spyOn(UnifiedAuthNS as any, 'authenticateRequest').mockResolvedValue({
      user: createMockUser({ roles: ['admin'] }),
      error: null,
    } as any);

    const resp = await protectedHandler(new Request('http://localhost/api/test'));
    expect(resp.status).toBe(200);
    expect(handler).toHaveBeenCalledOnce();
  });

  it('returns 401 when authentication fails', async () => {
    const handler = vi.fn();
    const protectedHandler = withAuth(['admin'])(handler) as any;

    vi.spyOn(UnifiedAuthNS as any, 'authenticateRequest').mockResolvedValue({
      user: null,
      error: new Response('Unauthorized', { status: 401 }),
    } as any);

    const resp = await protectedHandler(new Request('http://localhost/api/test'));
    expect(resp.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it('returns 403 when user lacks required role', async () => {
    const handler = vi.fn();
    const protectedHandler = withAuth(['admin'])(handler) as any;

    vi.spyOn(UnifiedAuthNS as any, 'authenticateRequest').mockResolvedValue({
      user: createMockUser({ roles: ['employee'] }),
      error: null,
    } as any);

    const resp = await protectedHandler(new Request('http://localhost/api/test'));
    expect(resp.status).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('requireSuperAdmin', () => {
  it('creates middleware wrapper', () => {
    const handler = vi.fn();
    const middleware = requireSuperAdmin(handler);
    expect(typeof middleware).toBe('function');
    expect(middleware).not.toBe(handler);
  });
});
