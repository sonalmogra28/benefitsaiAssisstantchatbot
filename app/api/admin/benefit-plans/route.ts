import { type NextRequest, NextResponse } from 'next/server';
import { withAuth, PERMISSIONS } from '@/lib/auth/unified-auth';
import { rateLimiters } from '@/lib/middleware/rate-limit';
import { logger } from '@/lib/logger';
import { benefitService } from '@/lib/services/benefit-service';
import { createBenefitPlanSchema } from '@/lib/schemas/benefits';
import { z } from 'zod';

// POST /api/admin/benefit-plans - Create a new benefit plan
export const POST = withAuth(undefined, [PERMISSIONS.MANAGE_BENEFITS])(async (request: NextRequest) => {
  const startTime = Date.now();
  
  try {
    // Apply rate limiting
    const rateLimitResponse = await rateLimiters.admin(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Extract user context injected by withAuth
    const userId = request.headers.get('x-user-id')!;
    const companyId = request.headers.get('x-company-id')!;

    const body = await request.json();
    const validatedData = createBenefitPlanSchema.parse(body);

    logger.info('API Request: POST /api/admin/benefit-plans', {
      userId: userId,
      companyId: companyId,
      planName: validatedData.name
    });

    // Create the benefit plan
    const newPlan = await benefitService.createBenefitPlan({
      ...validatedData,
      companyId: companyId,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const duration = Date.now() - startTime;
    logger.apiResponse('POST', '/api/admin/benefit-plans', 201, duration, {
      userId: userId,
      companyId: companyId,
      planId: newPlan.id
    });

    return NextResponse.json({
      success: true,
      data: newPlan,
      message: 'Benefit plan created successfully'
    }, { status: 201 });

  } catch (error) {
    const duration = Date.now() - startTime;
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid data format', 
          details: error.errors 
        },
        { status: 400 }
      );
    }
    
    logger.error('Benefit plan creation error', {
      path: request.nextUrl.pathname,
      method: request.method,
      duration
    }, error as Error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create benefit plan' 
      },
      { status: 500 }
    );
  }
});

// GET /api/admin/benefit-plans - Get all benefit plans for the company
export const GET = withAuth(undefined, [PERMISSIONS.VIEW_BENEFITS])(async (request: NextRequest) => {
  const startTime = Date.now();
  
  try {
    // Apply rate limiting
    const rateLimitResponse = await rateLimiters.admin(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Extract user context injected by withAuth
    const userId = request.headers.get('x-user-id')!;
    const companyId = request.headers.get('x-company-id')!;

    logger.info('API Request: GET /api/admin/benefit-plans', {
      userId: userId,
      companyId: companyId
    });

    // Get all benefit plans for the company
    const plans = await benefitService.getBenefitPlans(companyId);

    const duration = Date.now() - startTime;
    logger.apiResponse('GET', '/api/admin/benefit-plans', 200, duration, {
      userId: userId,
      companyId: companyId,
      planCount: plans.length
    });

    return NextResponse.json({
      success: true,
      data: plans,
      meta: {
        count: plans.length,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('Benefit plans fetch error', {
      path: request.nextUrl.pathname,
      method: request.method,
      duration
    }, error as Error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch benefit plans' 
      },
      { status: 500 }
    );
  }
});
