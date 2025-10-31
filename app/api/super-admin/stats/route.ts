export const dynamic = 'force-dynamic';

import { type NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/unified-auth';
import { analyticsService } from '@/lib/services/analytics.service';
import { logger, logError } from '@/lib/logger';

export const GET = requireSuperAdmin(async (request: NextRequest) => {
  const startTime = Date.now();
  
  try {
    const userId = request.headers.get('x-user-id')!;
    logger.info({ userId }, 'API Request: GET /api/super-admin/stats');

    // Get platform analytics
    const analytics = await analyticsService.getPlatformAnalytics();
    
    // Calculate additional metrics
    const monthlyGrowth = await calculateMonthlyGrowth();
    const systemHealth = determineSystemHealth(analytics);
    
    const stats = {
      totalUsers: analytics.totalUsers,
      totalDocuments: analytics.totalDocuments,
      totalBenefitPlans: analytics.totalBenefitPlans,
      activeEnrollments: analytics.activeUsers,
      activeChats: analytics.totalConversations,
      monthlyGrowth,
      systemHealth,
      apiUsage: analytics.apiCalls,
      storageUsed: analytics.storageUsed,
      systemMetrics: analytics.systemMetrics
    };

    const duration = Date.now() - startTime;
    
    logger.info({
      method: 'GET',
      endpoint: '/api/super-admin/stats',
      status: 200,
      duration,
      userId: userId,
      totalUsers: stats.totalUsers,
      totalDocuments: stats.totalDocuments
    }, 'API Response');

    return NextResponse.json({
      success: true,
      data: stats
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logError('Super admin stats error', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch platform stats' 
      },
      { status: 500 }
    );
  }
});

async function calculateMonthlyGrowth(): Promise<number> {
  try {
    // Calculate growth based on user registrations this month vs last month
    // This is a simplified calculation
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    
    // In a real implementation, you'd query the database for user counts
    // For now, return a placeholder
    return 12.5; // 12.5% growth
  } catch (error) {
    logError('Failed to calculate monthly growth', error);
    return 0;
  }
}

function determineSystemHealth(analytics: any): 'healthy' | 'degraded' | 'critical' {
  try {
    const { systemMetrics } = analytics;
    
    if (!systemMetrics) {
      return 'degraded';
    }
    
    const { cpuUsage, memoryUsage, errorRate } = systemMetrics;
    
    // Determine health based on metrics
    if (cpuUsage > 90 || memoryUsage > 90 || errorRate > 10) {
      return 'critical';
    } else if (cpuUsage > 70 || memoryUsage > 70 || errorRate > 5) {
      return 'degraded';
    } else {
      return 'healthy';
    }
  } catch (error) {
    logError('Failed to determine system health', error);
    return 'degraded';
  }
}

