// app/api/super-admin/service/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin, requireCompanyAdmin } from '@/lib/auth/unified-auth';
import { rateLimiters } from '@/lib/middleware/rate-limit';
import { logger } from '@/lib/logger';
import { superAdminService } from '@/lib/services/super-admin.service';

export const GET = requireCompanyAdmin(async (request: NextRequest) => {
  const startTime = Date.now();
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  try {
    // Apply rate limiting
    const rateLimitResponse = await rateLimiters.admin(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Authenticate and authorize
    // Extract user information from headers
    const userId = request.headers.get('x-user-id')!;
    const userCompanyId = request.headers.get('x-company-id')!;
    // Authentication handled by requireCompanyAdmin/requireSuperAdmin
    // Error handling managed by auth middleware

    logger.info('API Request: GET /api/super-admin/service', {
      userId: userId,
      action
    });

    switch (action) {
      case 'getPlatformStats': {
        const stats = await superAdminService.getPlatformStats();
        return NextResponse.json({ success: true, data: stats });
      }
      case 'getRecentActivity': {
        const limit = Number.parseInt(searchParams.get('limit') || '10', 10);
        const activity = await superAdminService.getRecentActivity(limit);
        return NextResponse.json({ success: true, data: activity });
      }
      case 'getSystemSettings': {
        const settings = await superAdminService.getSystemSettings();
        return NextResponse.json({ success: true, data: settings });
      }
      default:
        return NextResponse.json({ 
          success: false,
          error: 'Invalid action' 
        }, { status: 400 });
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('Super admin service GET error', {
      path: request.nextUrl.pathname,
      method: request.method,
      action,
      duration
    }, error as Error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal Server Error' 
      },
      { status: 500 }
    );
  }
  });

export const POST = requireCompanyAdmin(async (request: NextRequest) => {
  const startTime = Date.now();
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  try {
    // Apply rate limiting
    const rateLimitResponse = await rateLimiters.admin(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Authenticate and authorize
    // Extract user information from headers
    const userId = request.headers.get('x-user-id')!;
    const userCompanyId = request.headers.get('x-company-id')!;
    // Authentication handled by requireCompanyAdmin/requireSuperAdmin
    // Error handling managed by auth middleware

    logger.info('API Request: POST /api/super-admin/service', {
      userId: userId,
      action
    });

    switch (action) {
      case 'updateSystemSettings': {
        const body = await request.json();
        await superAdminService.updateSystemSettings(body);
        return NextResponse.json({ 
          success: true,
          message: 'Settings updated successfully' 
        });
      }
      default:
        return NextResponse.json({ 
          success: false,
          error: 'Invalid action' 
        }, { status: 400 });
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('Super admin service POST error', {
      path: request.nextUrl.pathname,
      method: request.method,
      action,
      duration
    }, error as Error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal Server Error' 
      },
      { status: 500 }
    );
  }
});
