/**
 * Monitoring Metrics API
 * Real-time system metrics endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { productionMonitor } from '@/lib/monitoring/production-monitor';
import { alertingSystem } from '@/lib/monitoring/advanced-alerting';
import { productionCache, chatCache, analyticsCache } from '@/lib/performance/advanced-caching';

export async function GET(request: NextRequest) {
  try {
    // Get system health
    const health = await productionMonitor.performHealthCheck();
    
    // Get cache metrics
    const [productionCacheHealth, chatCacheHealth, analyticsCacheHealth] = await Promise.all([
      productionCache.getHealth(),
      chatCache.getHealth(),
      analyticsCache.getHealth()
    ]);

    // Calculate aggregated metrics
    const metrics = {
      responseTime: health.metrics.responseTime,
      errorRate: health.metrics.errorRate,
      throughput: health.metrics.throughput,
      memoryUsage: health.metrics.memoryUsage,
      cpuUsage: health.metrics.cpuUsage,
      activeUsers: Math.floor(Math.random() * 100) + 50, // Simulated active users
      totalRequests: Math.floor(Math.random() * 10000) + 5000, // Simulated total requests
      cacheHitRate: (productionCacheHealth.metrics.hitRate + 
                    chatCacheHealth.metrics.hitRate + 
                    analyticsCacheHealth.metrics.hitRate) / 3,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Failed to get monitoring metrics:', error);
    return NextResponse.json(
      { error: 'Failed to get monitoring metrics' },
      { status: 500 }
    );
  }
}
