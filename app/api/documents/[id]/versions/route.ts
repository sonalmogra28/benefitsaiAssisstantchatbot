/**
 * Document Version History API
 * GET /api/documents/[id]/versions - Get version history
 * POST /api/documents/[id]/versions/[version]/rollback - Rollback to version
 * 
 * Best Practices:
 * - Immutable version history
 * - Audit trail for rollbacks
 * - Clear version metadata
 */

import { NextRequest, NextResponse } from 'next/server';
import { DocumentsRepository } from '@/lib/db/cosmos';
import { getServerSession } from 'next-auth';

/**
 * GET /api/documents/[id]/versions - Get version history
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const companyId = request.headers.get('x-company-id');
    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 });
    }

    const history = await DocumentsRepository.getVersionHistory(params.id, companyId);

    return NextResponse.json({
      success: true,
      data: history,
    });
  } catch (error) {
    console.error('[API ERROR] Get version history failed:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch version history' },
      { status: 500 }
    );
  }
}
