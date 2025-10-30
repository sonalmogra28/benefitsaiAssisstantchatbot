import { NextRequest, NextResponse } from 'next/server';
import { logger, logError } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const errorData = await request.json();
    logger.error({
      ...errorData,
      serverTime: new Date().toISOString(),
    }, '[CLIENT ERROR LOG]:');
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, 'Failed to log client error');
    return NextResponse.json({ error: 'Failed to log error' }, { status: 500 });
  }
}
