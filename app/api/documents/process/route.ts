/**
 * Document Processing API
 * Handles document upload and processing
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCompanyAdmin } from '@/lib/auth/unified-auth';
import { rateLimiters } from '@/lib/middleware/rate-limit';
import { logger } from '@/lib/logger';
import { documentService } from '@/lib/document-processing/document-service';
import { z } from 'zod';

// Document processing request schema
const processRequestSchema = z.object({
  fileName: z.string().min(1, 'File name is required'),
  mimeType: z.string().min(1, 'MIME type is required'),
  fileUrl: z.string().url('Valid file URL is required'),
  category: z.string().optional().default('benefits'),
  tags: z.array(z.string()).optional().default([])
});

export const POST = requireCompanyAdmin(async (request: NextRequest) => {
  const startTime = Date.now();
  
  try {
    // Apply rate limiting
    const rateLimitResponse = await rateLimiters.upload(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const userId = request.headers.get('x-user-id')!;
    const companyId = request.headers.get('x-company-id')!;

    // Parse request body
    const body = await request.json();
    const validatedData = processRequestSchema.parse(body);

    logger.info('Document processing request', {
      userId,
      companyId,
      fileName: validatedData.fileName,
      mimeType: validatedData.mimeType
    });

    // Download file from URL
    const fileResponse = await fetch(validatedData.fileUrl);
    if (!fileResponse.ok) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to download file from URL' 
        },
        { status: 400 }
      );
    }

    const fileBuffer = Buffer.from(await fileResponse.arrayBuffer());

    // Process the document
    const result = await documentService.uploadDocument(
      fileBuffer,
      validatedData.fileName,
      validatedData.mimeType,
      companyId,
      userId,
      {
        category: validatedData.category,
        tags: validatedData.tags
      }
    );

    const duration = Date.now() - startTime;

    if (result.success) {
      logger.info('Document processed successfully', {
        userId,
        companyId,
        documentId: result.documentId,
        fileName: validatedData.fileName,
        duration
      });

      return NextResponse.json({
        success: true,
        data: {
          documentId: result.documentId,
          processingResult: result.processingResult,
          message: 'Document processed successfully'
        }
      });
    } else {
      logger.error('Document processing failed', {
        userId,
        companyId,
        fileName: validatedData.fileName,
        error: result.error,
        duration
      });

      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Document processing failed'
        },
        { status: 400 }
      );
    }

  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('Document processing API error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      duration,
      userId: request.headers.get('x-user-id'),
      companyId: request.headers.get('x-company-id')
    });
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
});
