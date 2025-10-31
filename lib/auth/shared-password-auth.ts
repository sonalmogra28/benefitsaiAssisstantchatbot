/**
 * Shared password authentication for subdomain deployment
 * Simple authentication system using shared password for demo/testing purposes
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'crypto';
import { logger } from '@/lib/logger';

export interface SharedPasswordUser {
  id: string;
  email: string;
  name: string;
  companyId: string;
  roles: string[];
  permissions: string[];
  isSharedPassword: boolean;
}

export interface SharedPasswordAuthResult {
  user: SharedPasswordUser | null;
  error: NextResponse | null;
  isAuthenticated: boolean;
}

export class SharedPasswordAuth {
  private static readonly EMPLOYEE_PASSWORD_HASH = process.env.SHARED_PASSWORD_HASH || 
    this.hashPassword('amerivet2024!'); // Employee password
  private static readonly ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || 
    this.hashPassword('admin2024!'); // Admin password
  private static readonly SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  private static readonly MAX_ATTEMPTS = 5;
  private static readonly LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

  /**
   * Hash password using SHA-256
   */
  private static hashPassword(password: string): string {
    return createHash('sha256').update(password).digest('hex');
  }

  /**
   * Verify password against hash
   */
  private static verifyPassword(password: string, hash: string): boolean {
    const passwordHash = this.hashPassword(password);
    return timingSafeEqual(Buffer.from(passwordHash), Buffer.from(hash));
  }

  /**
   * Authenticate with shared password
   */
  static async authenticateWithPassword(
    request: NextRequest,
    password: string,
    userInfo?: {
      email?: string;
      name?: string;
      companyId?: string;
    }
  ): Promise<SharedPasswordAuthResult> {
    try {
      // Check rate limiting for password attempts
      const rateLimitResult = await this.checkPasswordRateLimit(request);
      if (!rateLimitResult.allowed) {
        return {
          user: null,
          error: NextResponse.json(
            { 
              error: 'Too many password attempts. Please try again later.',
              code: 'RATE_LIMIT_EXCEEDED',
              retryAfter: rateLimitResult.retryAfter
            },
            { status: 429 }
          ),
          isAuthenticated: false,
        };
      }

      // Verify password and determine role
      let userRole: string;
      let userPermissions: string[];
      
      if (this.verifyPassword(password, this.ADMIN_PASSWORD_HASH)) {
        // Admin access
        userRole = 'company-admin';
        userPermissions = [
          'VIEW_BENEFITS', 'COMPARE_PLANS', 'CALCULATE_COSTS',
          'MANAGE_EMPLOYEES', 'VIEW_COMPANY_ANALYTICS', 'MANAGE_COMPANY_BENEFITS',
          'MANAGE_FAQS', 'VIEW_ANALYTICS', 'MANAGE_SETTINGS'
        ];
      } else if (this.verifyPassword(password, this.EMPLOYEE_PASSWORD_HASH)) {
        // Employee access
        userRole = 'employee';
        userPermissions = ['VIEW_BENEFITS', 'COMPARE_PLANS', 'CALCULATE_COSTS'];
      } else {
        await this.recordFailedAttempt(request);
        return {
          user: null,
          error: NextResponse.json(
            { error: 'Invalid password' },
            { status: 401 }
          ),
          isAuthenticated: false,
        };
      }

      // Create user session
      const user: SharedPasswordUser = {
        id: `shared-${Date.now()}`,
        email: userInfo?.email || (userRole === 'company-admin' ? 'admin@amerivet.com' : 'demo@benefits.com'),
        name: userInfo?.name || (userRole === 'company-admin' ? 'Admin User' : 'Demo User'),
        companyId: userInfo?.companyId || 'amerivet',
        roles: [userRole],
        permissions: userPermissions,
        isSharedPassword: true,
      };

      // Create session token
      const sessionToken = await this.createSessionToken(user);

      // Set session cookie
      const response = NextResponse.json(
        { 
          success: true, 
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            companyId: user.companyId,
            roles: user.roles,
            permissions: user.permissions,
          }
        },
        { status: 200 }
      );

      response.cookies.set('shared-session', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: this.SESSION_DURATION / 1000,
        path: '/',
      });

      // Clear failed attempts on successful login
      await this.clearFailedAttempts(request);

      logger.info('Shared password authentication successful', {
        userId: user.id,
        email: user.email,
        companyId: user.companyId,
      });

      return {
        user,
        error: null,
        isAuthenticated: true,
      };

    } catch (error) {
      logger.error('Shared password authentication failed', error);
      return {
        user: null,
        error: NextResponse.json(
          { error: 'Authentication failed' },
          { status: 500 }
        ),
        isAuthenticated: false,
      };
    }
  }

  /**
   * Validate session token
   */
  static async validateSession(request: NextRequest): Promise<SharedPasswordAuthResult> {
    try {
      const sessionToken = request.cookies.get('shared-session')?.value;
      
      if (!sessionToken) {
        return {
          user: null,
          error: NextResponse.json(
            { error: 'No session found' },
            { status: 401 }
          ),
          isAuthenticated: false,
        };
      }

      // Verify session token
      const user = await this.verifySessionToken(sessionToken);
      
      if (!user) {
        return {
          user: null,
          error: NextResponse.json(
            { error: 'Invalid or expired session' },
            { status: 401 }
          ),
          isAuthenticated: false,
        };
      }

      return {
        user,
        error: null,
        isAuthenticated: true,
      };

    } catch (error) {
      logger.error('Session validation failed', error);
      return {
        user: null,
        error: NextResponse.json(
          { error: 'Session validation failed' },
          { status: 500 }
        ),
        isAuthenticated: false,
      };
    }
  }

  /**
   * Create session token
   */
  private static async createSessionToken(user: SharedPasswordUser): Promise<string> {
    const payload = {
      userId: user.id,
      email: user.email,
      companyId: user.companyId,
      roles: user.roles,
      permissions: user.permissions,
      isSharedPassword: true,
      exp: Date.now() + this.SESSION_DURATION,
      iat: Date.now(),
    };

    // Simple JWT-like token (in production, use proper JWT library)
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = createHash('sha256')
      .update(`${header}.${payloadB64}`)
      .update(process.env.JWT_SECRET || 'shared-password-secret')
      .digest('base64url');

    return `${header}.${payloadB64}.${signature}`;
  }

  /**
   * Verify session token
   */
  private static async verifySessionToken(token: string): Promise<SharedPasswordUser | null> {
    try {
      const [header, payload, signature] = token.split('.');
      
      if (!header || !payload || !signature) {
        return null;
      }

      // Verify signature
      const expectedSignature = createHash('sha256')
        .update(`${header}.${payload}`)
        .update(process.env.JWT_SECRET || 'shared-password-secret')
        .digest('base64url');

      if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
        return null;
      }

      // Parse payload
      const payloadData = JSON.parse(Buffer.from(payload, 'base64url').toString());
      
      // Check expiration
      if (payloadData.exp < Date.now()) {
        return null;
      }

      return {
        id: payloadData.userId,
        email: payloadData.email,
        name: payloadData.name || payloadData.email,
        companyId: payloadData.companyId,
        roles: payloadData.roles || ['employee'],
        permissions: payloadData.permissions || ['VIEW_BENEFITS'],
        isSharedPassword: true,
      };

    } catch (error) {
      logger.error('Token verification failed', error);
      return null;
    }
  }

  /**
   * Check password attempt rate limiting
   */
  private static async checkPasswordRateLimit(request: NextRequest): Promise<{
    allowed: boolean;
    retryAfter?: number;
  }> {
    const ip = this.getClientIP(request);
>>>>>>> main
    
    // This would typically use Redis, but for simplicity, we'll use a simple in-memory store
    // In production, implement proper Redis-based rate limiting
    const attempts = this.getFailedAttempts(ip);
    
    if (attempts >= this.MAX_ATTEMPTS) {
      const lastAttempt = this.getLastAttemptTime(ip);
      const timeSinceLastAttempt = Date.now() - lastAttempt;
      
      if (timeSinceLastAttempt < this.LOCKOUT_DURATION) {
        return {
          allowed: false,
          retryAfter: Math.ceil((this.LOCKOUT_DURATION - timeSinceLastAttempt) / 1000),
        };
      } else {
        // Reset attempts after lockout period
        this.clearFailedAttempts(request);
      }
    }

    return { allowed: true };
  }

  /**
   * Record failed password attempt
   */
  private static async recordFailedAttempt(request: NextRequest): Promise<void> {
    const ip = this.getClientIP(request);
    this.incrementFailedAttempts(ip);
  }

  /**
   * Clear failed attempts
   */
  private static async clearFailedAttempts(request: NextRequest): Promise<void> {
    const ip = this.getClientIP(request);
    this.resetFailedAttempts(ip);
  }

  /**
   * Get client IP address
   */
  private static getClientIP(request: NextRequest): string {
    return (
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      'unknown'
    );
  }

  // Simple in-memory storage for demo purposes
  // In production, use Redis or database