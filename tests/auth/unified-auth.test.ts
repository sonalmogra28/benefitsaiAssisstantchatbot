/**
 * Unified Auth Tests
 * Comprehensive test suite for authentication system
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnifiedAuth, withAuth, requireSuperAdmin } from '@/lib/auth/unified-auth';
import { createMockUser } from '../setup';

// Mock the authenticateRequest method specifically
vi.spyOn(UnifiedAuth, 'authenticateRequest');

describe('UnifiedAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('hasRole', () => {
    it('should return true when user has the specified role', () => {
      const user = createMockUser({ roles: ['employee', 'admin'] });
      expect(UnifiedAuth.hasRole(user, 'employee')).toBe(true);
      expect(UnifiedAuth.hasRole(user, 'admin')).toBe(true);
    });

    it('should return false when user does not have the specified role', () => {
      const user = createMockUser({ roles: ['employee'] });
      expect(UnifiedAuth.hasRole(user, 'admin')).toBe(false);
    });
  });

  describe('hasPermission', () => {
    it('should return true when user has the specified permission', () => {
      const user = createMockUser({ permissions: ['view_benefits', 'chat_with_ai'] });
      expect(UnifiedAuth.hasPermission(user, 'view_benefits')).toBe(true);
    });

    it('should return false when user does not have the specified permission', () => {
      const user = createMockUser({ permissions: ['view_benefits'] });
      expect(UnifiedAuth.hasPermission(user, 'manage_users')).toBe(false);
    });
  });

  describe('hasAnyRole', () => {
    it('should return true when user has any of the specified roles', () => {
      const user = createMockUser({ roles: ['employee'] });
      expect(UnifiedAuth.hasAnyRole(user, ['admin', 'employee'])).toBe(true);
    });

    it('should return false when user has none of the specified roles', () => {
      const user = createMockUser({ roles: ['employee'] });
      expect(UnifiedAuth.hasAnyRole(user, ['admin', 'super_admin'])).toBe(false);
    });
  });

  describe('hasAnyPermission', () => {
    it('should return true when user has any of the specified permissions', () => {
      const user = createMockUser({ permissions: ['view_benefits'] });
      expect(UnifiedAuth.hasAnyPermission(user, ['view_benefits', 'manage_users'])).toBe(true);
    });

    it('should return false when user has none of the specified permissions', () => {
      const user = createMockUser({ permissions: ['view_benefits'] });
      expect(UnifiedAuth.hasAnyPermission(user, ['manage_users', 'manage_companies'])).toBe(false);
    });
  });

  describe('canAccessCompany', () => {
    it('should return true for super admin accessing any company', () => {
      const user = createMockUser({ roles: ['super-admin'], companyId: 'company-1' });
      expect(UnifiedAuth.canAccessCompany(user, 'company-2')).toBe(true);
    });

    it('should return true for user accessing their own company', () => {
      const user = createMockUser({ companyId: 'company-1' });
      expect(UnifiedAuth.canAccessCompany(user, 'company-1')).toBe(true);
    });

    it('should return false for user accessing different company', () => {
      const user = createMockUser({ companyId: 'company-1' });
      expect(UnifiedAuth.canAccessCompany(user, 'company-2')).toBe(false);
    });
  });

  describe('getPermissionsForRole', () => {
    it('should return correct permissions for employee role', () => {
      const permissions = UnifiedAuth.getPermissionsForRole('employee');
      expect(permissions).toContain('view_benefits');
      expect(permissions).toContain('chat_with_ai');
    });

    it('should return correct permissions for super_admin role', () => {
      const permissions = UnifiedAuth.getPermissionsForRole('super-admin');
      expect(permissions).toContain('manage_users');
      expect(permissions).toContain('manage_companies');
    });

    it('should return empty array for unknown role', () => {
      const permissions = UnifiedAuth.getPermissionsForRole('unknown_role');
      expect(permissions).toEqual([]);
    });
  });
});

describe('withAuth middleware', () => {
  it('should call handler when authentication succeeds', async () => {
    const mockHandler = vi.fn().mockResolvedValue(new Response('OK'));
    const mockRequest = new Request('http://localhost/api/test');
    
    // Mock successful authentication
    vi.mocked(UnifiedAuth.authenticateRequest).mockResolvedValue({
      user: createMockUser(),
      error: null,
      isAuthenticated: true
    });

    const protectedHandler = withAuth()(mockHandler);
    await protectedHandler(mockRequest);

    expect(mockHandler).toHaveBeenCalled();
  });

  it('should return 401 when authentication fails', async () => {
    const mockHandler = vi.fn();
    const mockRequest = new Request('http://localhost/api/test');
    
    // Mock failed authentication
    vi.mocked(UnifiedAuth.authenticateRequest).mockResolvedValue({
      user: null,
      error: new Response('Unauthorized', { status: 401 }),
      isAuthenticated: false
    });

    const protectedHandler = withAuth()(mockHandler);
    const response = await protectedHandler(mockRequest);

    expect(response.status).toBe(401);
    expect(mockHandler).not.toHaveBeenCalled();
  });

  it('should return 403 when user lacks required role', async () => {
    const mockHandler = vi.fn();
    const mockRequest = {
      ...new Request('http://localhost/api/test'),
      nextUrl: { pathname: '/api/test' }
    } as any;
    
    // Mock authentication with insufficient role
    vi.mocked(UnifiedAuth.authenticateRequest).mockResolvedValue({
      user: createMockUser({ roles: ['employee'] }),
      error: null,
      isAuthenticated: true
    });

    const protectedHandler = withAuth(['admin'])(mockHandler);
    const response = await protectedHandler(mockRequest);

    expect(response.status).toBe(403);
    expect(mockHandler).not.toHaveBeenCalled();
  });
});

describe('requireSuperAdmin', () => {
  it('should create middleware that requires super admin role', () => {
    const handler = vi.fn();
    const middleware = requireSuperAdmin(handler);

    expect(typeof middleware).toBe('function');
    expect(middleware).not.toBe(handler); // Should be a wrapper function
  });
});
