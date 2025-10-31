export const dynamic = 'force-dynamic';

/**
 * Monitoring Alerts API
 * Alert management endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import { alertingSystem } from '@/lib/monitoring/advanced-alerting';

export async function GET(request: NextRequest) {
  try {
    const alerts = alertingSystem.getActiveAlerts();
    return NextResponse.json(alerts);
  } catch (error) {
    console.error('Failed to get alerts:', error);
    return NextResponse.json(
      { error: 'Failed to get alerts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, alertId, acknowledgedBy } = body;

    switch (action) {
      case 'acknowledge': {
        if (!alertId || !acknowledgedBy) {
          return NextResponse.json(
            { error: 'Missing required fields' },
            { status: 400 }
          );
        }
        
        const acknowledged = alertingSystem.acknowledgeAlert(alertId, acknowledgedBy);
        if (!acknowledged) {
          return NextResponse.json(
            { error: 'Alert not found' },
            { status: 404 }
          );
        }
        
        return NextResponse.json({ success: true });
      }

      case 'resolve': {
        if (!alertId) {
          return NextResponse.json(
            { error: 'Missing alertId' },
            { status: 400 }
          );
        }
        
        const resolved = alertingSystem.resolveAlert(alertId);
        if (!resolved) {
          return NextResponse.json(
            { error: 'Alert not found' },
            { status: 404 }
          );
        }
        
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Failed to process alert action:', error);
    return NextResponse.json(
      { error: 'Failed to process alert action' },
      { status: 500 }
    );
  }
}

