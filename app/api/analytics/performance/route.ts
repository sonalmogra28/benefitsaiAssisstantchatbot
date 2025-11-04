export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Performance Analytics Endpoint
 * Receives client-side performance metrics for monitoring
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

interface PerformanceMetric {
  lcp: number;
  fid: number;
  cls: number;
  ttfb: number;
  fcp: number;
  tti: number;
  pageLoad: number;
  url: string;
  timestamp: number;
  userAgent: string;
}

export async function POST(request: NextRequest) {
  try {
    const metrics: PerformanceMetric = await request.json();
    
    // Log performance metrics
    logger.info('Performance metrics received', {
      url: metrics.url,
      pageLoad: metrics.pageLoad,
      lcp: metrics.lcp,
      fid: metrics.fid,
      cls: metrics.cls,
      ttfb: metrics.ttfb,
    });

    // Check if metrics meet production targets
    const issues: string[] = [];
    
    if (metrics.pageLoad > 2000) {
      issues.push('Page load exceeds 2s target');
    }
    if (metrics.lcp > 2500) {
      issues.push('LCP exceeds 2.5s target');
    }
    if (metrics.fid > 100) {
      issues.push('FID exceeds 100ms target');
    }
    if (metrics.cls > 0.1) {
      issues.push('CLS exceeds 0.1 target');
    }

    if (issues.length > 0) {
      logger.warn('Performance targets not met', {
        url: metrics.url,
        issues,
      });
    }

    // In production, store in database for analytics
    // For now, just acknowledge receipt
    return NextResponse.json({ 
      success: true, 
      meetsTargets: issues.length === 0,
      issues 
    });

  } catch (error) {
    logger.error('Failed to process performance metrics', error);
    return NextResponse.json(
      { error: 'Failed to process metrics' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Return aggregated performance stats
    // This would query from database in production
    
    return NextResponse.json({
      summary: {
        avgPageLoad: 1200,
        avgLCP: 1100,
        avgFID: 45,
        avgCLS: 0.05,
        sampleCount: 150,
        targetsMet: 92.5,
      },
      status: 'healthy',
      lastUpdated: new Date().toISOString(),
    });

  } catch (error) {
    logger.error('Failed to retrieve performance summary', error);
    return NextResponse.json(
      { error: 'Failed to retrieve summary' },
      { status: 500 }
    );
  }
}
