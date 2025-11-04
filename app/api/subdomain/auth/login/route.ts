export const dynamic = 'force-dynamic';

/**
 * Subdomain shared password authentication endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { SharedPasswordAuth } from '@/lib/auth/shared-password-auth';
import { rateLimiters } from '@/lib/middleware/rate-limit';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await rateLimiters.auth(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const body = await request.json();
    const { password, email, name, companyId } = body;

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    // Authenticate with shared password
    const result = await SharedPasswordAuth.authenticateWithPassword(
      request,
      password,
      {
        email: email || 'demo@benefits.com',
        name: name || 'Demo User',
        companyId: companyId || 'demo-company',
      }
    );

    if (!result.isAuthenticated || !result.user) {
      return result.error || NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }

    logger.info('Subdomain login successful', {
      userId: result.user.id,
      email: result.user.email,
      companyId: result.user.companyId,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        companyId: result.user.companyId,
        roles: result.user.roles,
        permissions: result.user.permissions,
      }
    });

  } catch (error) {
    logger.error('Subdomain login error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Validate existing session
    const result = await SharedPasswordAuth.validateSession(request);

    if (!result.isAuthenticated || !result.user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        companyId: result.user.companyId,
        roles: result.user.roles,
        permissions: result.user.permissions,
      }
    });

  } catch (error) {
    logger.error('Session validation error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await rateLimiters.auth(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    logger.info('Subdomain logout', {
      ip: request.headers.get('x-forwarded-for') || 'unknown'
    });

    return SharedPasswordAuth.logout();

  } catch (error) {
    logger.error('Subdomain logout error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

