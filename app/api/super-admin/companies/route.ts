// app/api/super-admin/companies/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin, requireCompanyAdmin } from '@/lib/auth/unified-auth';
import { rateLimiters } from '@/lib/middleware/rate-limit';
import { logger } from '@/lib/logger';
import { getRepositories } from '@/lib/azure/cosmos';

export const POST = requireCompanyAdmin(async (request: NextRequest) => {
  const startTime = Date.now();
  
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

    logger.info('API Request: POST /api/super-admin/companies', {
      userId: userId
    });

    const { name } = await request.json();

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Company name is required' },
        { status: 400 }
      );
    }

    // Create company using repository
    const repositories = await getRepositories();
    const company = await repositories.companies.create({
      name: name.trim(),
      status: 'active',
      createdAt: new Date(),
      createdBy: userId
    });

    const duration = Date.now() - startTime;
    
    logger.apiResponse('POST', '/api/super-admin/companies', 201, duration, {
      userId: userId,
      companyId: company.resource?.id || 'unknown'
    });

    return NextResponse.json({ 
      success: true,
      data: {
        id: company.resource?.id || 'unknown',
        name: company.resource?.name || 'Unknown',
        status: company.resource?.status || 'unknown'
      }
    }, { status: 201 });
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('Super admin create company error', {
      path: request.nextUrl.pathname,
      method: request.method,
      duration
    }, error as Error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create company' 
      },
      { status: 500 }
    );
  }
});
