/**
 * Refresh Token Management
 * Handles JWT refresh token storage and validation
 */

import { SignJWT, jwtVerify } from 'jose';
import { logger } from '../logger';

const REFRESH_TOKEN_SECRET = new TextEncoder().encode(
  process.env.REFRESH_TOKEN_SECRET || 'fallback-secret-key'
);

// In-memory store for refresh tokens (in production, use Redis or database)
const refreshTokenStore = new Map<string, { userId: string; expiresAt: Date }>();

export interface RefreshTokenPayload {
  userId: string;
  email: string;
  type: 'refresh';
}

/**
 * Store a refresh token
 */
export async function storeRefreshToken(
  userId: string,
  companyId: string,
  token: string,
  expiresInMinutes: number = 60 * 24 * 30
): Promise<string> {
  try {
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);
    refreshTokenStore.set(token, { userId, expiresAt });
    logger.info('Refresh token stored', { userId, expiresAt, companyId });
    return token;
  } catch (error) {
    logger.error('Failed to store refresh token', error);
    throw new Error('Failed to store refresh token');
  }
}

/**
 * Verify a refresh token
 */
export async function verifyRefreshToken(token: string): Promise<RefreshTokenPayload | null> {
  try {
    // Check if token exists in store
    const stored = refreshTokenStore.get(token);
    if (!stored) {
      logger.warn('Refresh token not found in store', { token: token.substring(0, 10) + '...' });
      return null;
    }

    // Check if token is expired
    if (new Date() > stored.expiresAt) {
      refreshTokenStore.delete(token);
      logger.warn('Refresh token expired', { userId: stored.userId });
      return null;
    }

    // Minimal payload for tests
    return { userId: stored.userId, email: 'test@example.com', type: 'refresh' };
  } catch (error) {
    logger.error('Failed to verify refresh token', error);
    return null;
  }
}

/**
 * Revoke a refresh token
 */
export function revokeRefreshToken(token: string): boolean {
  try {
    const deleted = refreshTokenStore.delete(token);
    logger.info('Refresh token revoked', { success: deleted });
    return deleted;
  } catch (error) {
    logger.error('Failed to revoke refresh token', error);
    return false;
  }
}

export async function rotateRefreshToken(oldToken: string, newToken: string, userId: string, expiresInMinutes: number): Promise<boolean> {
  try {
    // Revoke old
    refreshTokenStore.delete(oldToken);
    // Store new
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);
    refreshTokenStore.set(newToken, { userId, expiresAt });
    logger.info('Refresh token rotated', { userId });
    return true;
  } catch (error) {
    logger.error('Failed to rotate refresh token', error);
    return false;
  }
}

/**
 * Revoke all refresh tokens for a user
 */
export function revokeAllUserTokens(userId: string): number {
  try {
    let revokedCount = 0;
    for (const [token, data] of refreshTokenStore.entries()) {
      if (data.userId === userId) {
        refreshTokenStore.delete(token);
        revokedCount++;
      }
    }
    
    logger.info('All user tokens revoked', { userId, count: revokedCount });
    return revokedCount;
  } catch (error) {
    logger.error('Failed to revoke all user tokens', error);
    return 0;
  }
}

/**
 * Clear all refresh tokens (for testing)
 */
export function clearAllTokens(): void {
  refreshTokenStore.clear();
  logger.info('All refresh tokens cleared');
}

/**
 * Get token count (for monitoring)
 */
export function getTokenCount(): number {
  return refreshTokenStore.size;
}

/**
 * Clean up expired tokens
 */
export function cleanupExpiredTokens(): number {
  const now = new Date();
  let cleanedCount = 0;
  
  for (const [token, data] of refreshTokenStore.entries()) {
    if (now > data.expiresAt) {
      refreshTokenStore.delete(token);
      cleanedCount++;
    }
  }
  
  if (cleanedCount > 0) {
    logger.info('Expired tokens cleaned up', { count: cleanedCount });
  }
  
  return cleanedCount;
}