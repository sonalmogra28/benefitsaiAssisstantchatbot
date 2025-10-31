export const dynamic = 'force-dynamic';

import { type NextRequest, NextResponse } from 'next/server';
import { requireCompanyAdmin } from '@/lib/auth/unified-auth';
import { rateLimiters } from '@/lib/middleware/rate-limit';
import { logger } from '@/lib/logger';
import { getStorageServices } from '@/lib/azure/storage';

export const POST = requireCompanyAdmin(async (request: NextRequest) => {
  const startTime = Date.now();
  
  try {
    // Apply rate limiting
    const rateLimitResponse = await rateLimiters.upload(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const userId = request.headers.get('x-user-id')!;
    const { fileName, fileType } = await request.json();
    
    if (!fileName || !fileType) {
      return NextResponse.json(
        { success: false, error: 'fileName and fileType are required' },
        { status: 400 }
      );
    }

    logger.info('API Request: POST /api/admin/documents/upload-url', {
      userId,
      fileName,
      fileType
    });

    // Get storage services
    const storageServices = await getStorageServices();
    
    const blobName = `${new Date().getTime()}-${fileName}`;
    
    // Generate a pre-signed URL for upload (1 hour expiry)
    const sasUrl = await storageServices.documents.getFileUrl(blobName);

    const duration = Date.now() - startTime;
    
    logger.apiResponse('POST', '/api/admin/documents/upload-url', 200, duration, {
      userId,
      fileName,
      fileType
    });

    return NextResponse.json({ 
      success: true,
      data: {
        sasUrl, 
        blobName 
      }
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('SAS URL generation error', {
      path: request.nextUrl.pathname,
      method: request.method,
      duration
    }, error as Error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to generate upload URL' 
      }, 
      { status: 500 }
    );
  }
});

