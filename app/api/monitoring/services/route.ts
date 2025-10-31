export const dynamic = 'force-dynamic';

/**
 * Service Status API
 * Service health monitoring endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { productionMonitor } from '@/lib/monitoring/production-monitor';

export async function GET(request: NextRequest) {
  try {
    const health = await productionMonitor.performHealthCheck();
    
    const services = Object.entries(health.services).map(([name, status]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      status: status.status,
      responseTime: status.responseTime || 0,
      lastChecked: new Date().toISOString(),
      error: status.error
    }));

    return NextResponse.json(services);
  } catch (error) {
    console.error('Failed to get service status:', error);
    return NextResponse.json(
      { error: 'Failed to get service status' },
      { status: 500 }
    );
  }
}

