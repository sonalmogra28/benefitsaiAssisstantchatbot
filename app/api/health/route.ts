/**
 * Health Check API
 * Production health monitoring endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCompanyAdmin } from '@/lib/auth/unified-auth';
import { productionMonitor } from '@/lib/monitoring/production-monitor';
import { logger } from '@/lib/logger';

export const GET = requireCompanyAdmin(async (request: NextRequest) => {
  const startTime = Date.now();
  
  try {
    // Perform comprehensive health check
    const health = await productionMonitor.performHealthCheck();
    
    const duration = Date.now() - startTime;
    
    // Log health check
    logger.info('Health check performed', {
      status: health.status,
      duration,
      services: Object.keys(health.services).length,
      timestamp: health.timestamp
    });
    
    // Return appropriate status code
    const statusCode = health.status === 'healthy' ? 200 : 
                      health.status === 'degraded' ? 200 : 503;
    
    return NextResponse.json({
      status: health.status,
      timestamp: health.timestamp,
      duration,
      services: health.services,
      metrics: health.metrics,
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'production'
    }, { status: statusCode });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('Health check failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      duration
    });
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      duration,
      error: 'Health check failed',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'production'
    }, { status: 503 });
  }
});
