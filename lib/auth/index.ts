/**
 * Unified Authentication Export
 * Single entry point for all authentication functions
 * Ensures backward compatibility and consistent imports
 */

// Re-export everything from unified-auth (primary system)
export * from './unified-auth';

// Re-export from server-auth for server-side utilities
export * from './server-auth';

// Re-export from admin-auth for admin-specific functions
export * from './admin-auth';

// Legacy compatibility exports
export { requireAuth, withAuth } from './middleware';
export { requireAdmin, requireCompanyAdmin, requireSuperAdmin, withAdminAuth, withCompanyAdminAuth } from './admin-middleware';

// Legacy function exports for backward compatibility
export { 
  protectAdminEndpoint, 
  protectSuperAdminEndpoint, 
  protectCompanyEndpoint 
} from '../middleware/auth';
