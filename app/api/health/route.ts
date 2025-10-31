export const dynamic = 'force-dynamic';

/**
 * Health Check API
 * Production health monitoring endpoint
 */
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Fast path for local/dev environments without auth requirement
  if (process.env.NODE_ENV !== 'production' && process.env.FAST_HEALTH !== '0') {
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      duration: 0,
      services: {},
      metrics: {},
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      fast: true,
      reason: 'dev-short-circuit'
    }, { status: 200 });
  }

  // In production, enforce admin guard and full checks
  const startTime = Date.now();
  try {
    const [{ requireCompanyAdmin }, { productionMonitor }, { logger }] = await Promise.all([
      import('@/lib/auth/unified-auth') as any,
      import('@/lib/monitoring/production-monitor') as any,
      import('@/lib/logger') as any,
    ]);

    const handler = requireCompanyAdmin(async (req: NextRequest) => {
      const health = await productionMonitor.performHealthCheck();
      const duration = Date.now() - startTime;

      logger.info('Health check performed', {
        status: health.status,
        duration,
        services: Object.keys(health.services).length,
        timestamp: health.timestamp,
      });

      const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;
      return NextResponse.json({
        status: health.status,
        timestamp: health.timestamp,
        duration,
        services: health.services,
        metrics: health.metrics,
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'production',
      }, { status: statusCode });
    });

    return handler(request);
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('Health check failed', error);
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      duration,
      error: 'Health check failed',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'production',
    }, { status: 503 });
  }
}

