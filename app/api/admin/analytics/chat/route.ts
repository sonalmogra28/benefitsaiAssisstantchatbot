export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { type NextRequest, NextResponse } from 'next/server';
import { requireCompanyAdmin } from '@/lib/auth/unified-auth';
import { analyticsService } from '@/lib/services/analytics.service';
import { rateLimiters } from '@/lib/middleware/rate-limit';
import { logger } from '@/lib/logger';
import { CSVExporter } from '@/lib/utils/csv-export';
import { ExcelExporter } from '@/lib/utils/excel-export';
import { z } from 'zod';

// Schema for query parameters
const querySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  metric: z.enum(['overview', 'questions', 'users', 'costs']).optional(),
});

// Helper to extract auth from request
async function extractAuth(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  const userCompanyId = request.headers.get('x-company-id');
  return { userId: userId || '', companyId: userCompanyId || '' };
}

// GET handler - Direct export without middleware wrapper
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Extract auth without calling requireCompanyAdmin middleware
    const { userId, companyId } = await extractAuth(request);

    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID not found' },
        { status: 400 }
      );
    }

    // Apply rate limiting
    const rateLimitResponse = await rateLimiters.admin(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const params = querySchema.parse({
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      metric: searchParams.get('metric') || 'overview',
    });

    // Parse dates
    const dateRange =
      params.startDate && params.endDate
        ? {
            startDate: new Date(params.startDate),
            endDate: new Date(params.endDate),
          }
        : undefined;

    logger.info({ 
      userId: userId,
      companyId,
      metric: params.metric
     }, 'API Request: GET /api/admin/analytics/chat');

    // Get the requested analytics data
    switch (params.metric) {
      case 'questions': {
        const chatAnalytics = await analyticsService.getChatAnalytics(companyId);
        const duration = Date.now() - startTime;
        
        // logger.apiResponse removed
        
        return NextResponse.json({
          success: true,
          data: {
            topQuestions: chatAnalytics.topQuestions,
            totalChats: chatAnalytics.totalChats,
            averageMessagesPerChat: chatAnalytics.averageMessagesPerChat,
          }
        });
      }

      case 'users': {
        const userActivity = await analyticsService.getUserActivity(companyId);
        const duration = Date.now() - startTime;
        
        // logger.apiResponse removed
        
        return NextResponse.json({
          success: true,
          data: {
            users: userActivity,
            totalUsers: userActivity.length,
          }
        });
      }

      case 'costs': {
        const companyAnalytics = await analyticsService.getCompanyAnalytics(companyId);
        const duration = Date.now() - startTime;
        
        // logger.apiResponse removed
        
        return NextResponse.json({
          success: true,
          data: {
            averageCostPerEmployee: companyAnalytics.averageCostPerEmployee,
            employeeCount: companyAnalytics.employeeCount,
            enrollmentRate: companyAnalytics.enrollmentRate,
          }
        });
      }

      case 'overview':
      default: {
        const [chatAnalytics, companyAnalytics, userActivity] = await Promise.all([
          analyticsService.getChatAnalytics(companyId),
          analyticsService.getCompanyAnalytics(companyId),
          analyticsService.getUserActivity(companyId),
        ]);

        const duration = Date.now() - startTime;
        
        // logger.apiResponse removed

        return NextResponse.json({
          success: true,
          data: {
            overview: {
              totalChats: chatAnalytics.totalChats,
              averageMessagesPerChat: chatAnalytics.averageMessagesPerChat,
              peakHours: chatAnalytics.peakHours,
              employeeCount: companyAnalytics.employeeCount,
              activeEmployees: companyAnalytics.activeEmployees,
              monthlyChats: companyAnalytics.monthlyChats,
              enrollmentRate: companyAnalytics.enrollmentRate,
              topQuestions: chatAnalytics.topQuestions.slice(0, 5),
              recentActivity: userActivity.slice(0, 10),
            },
          }
        });
      }
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error({ 
      path: request.nextUrl.pathname,
      method: request.method,
      duration
    , err: error as Error }, 'Analytics API error');

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid parameters', 
          details: error.issues 
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch analytics' 
      },
      { status: 500 }
    );
  }
}

// POST handler - Direct export without middleware wrapper
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Extract auth without calling requireCompanyAdmin middleware
    const { userId, companyId } = await extractAuth(request);

    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID not found' },
        { status: 400 }
      );
    }

    // Apply rate limiting
    const rateLimitResponse = await rateLimiters.admin(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const body = await request.json();
    const { format = 'json', dateRange } = body;

    logger.info({ 
      userId: userId,
      companyId,
      format
     }, 'API Request: POST /api/admin/analytics/chat');

    // Get all analytics data
    const [chatAnalytics, companyAnalytics, userActivity] = await Promise.all([
      analyticsService.getChatAnalytics(companyId),
      analyticsService.getCompanyAnalytics(companyId),
      analyticsService.getUserActivity(companyId),
    ]);

    const exportData = {
      exportedAt: new Date().toISOString(),
      companyId,
      dateRange,
      analytics: {
        chat: chatAnalytics,
        company: companyAnalytics,
        users: userActivity,
      },
    };

    const duration = Date.now() - startTime;
    
    // logger.apiResponse removed

    // Handle CSV export
    if (format === 'csv') {
      const csvContent = CSVExporter.analyticsToCSV(exportData);
      const filename = `analytics-export-${companyId}-${new Date().toISOString().split('T')[0]}.csv`;
      const { headers } = CSVExporter.createDownloadableCSV(csvContent, filename);
      
      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          ...headers,
          'Content-Length': Buffer.byteLength(csvContent, 'utf8').toString()
        }
      });
    }

    // Handle Excel export
    if (format === 'excel') {
      const excelBuffer = await ExcelExporter.analyticsToExcel(exportData);
      const filename = `analytics-export-${companyId}-${new Date().toISOString().split('T')[0]}.xlsx`;
      const { headers } = ExcelExporter.createDownloadableExcel(excelBuffer, filename);
      
      return new NextResponse(excelBuffer as any, {
        status: 200,
        headers
      });
    }

    return NextResponse.json({
      success: true,
      data: exportData
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error({ 
      path: request.nextUrl.pathname,
      method: request.method,
      duration
    , err: error as Error }, 'Analytics export error');

    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to export analytics' 
      },
      { status: 500 }
    );
  }
}


