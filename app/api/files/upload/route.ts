// app/api/files/upload/route.ts
import { type NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/unified-auth';
import { USER_ROLES } from '@/lib/constants/roles';
import { getStorageServices } from '@/lib/azure/storage';
import { getContainer } from '@/lib/azure/cosmos-db';
import crypto from 'node:crypto';
import path from 'node:path';

// File validation configuration
const ALLOWED_FILE_TYPES = {
  // Documents
  'application/pdf': { ext: '.pdf', maxSize: 10 * 1024 * 1024 }, // 10MB
  'application/msword': { ext: '.doc', maxSize: 10 * 1024 * 1024 },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
    ext: '.docx',
    maxSize: 10 * 1024 * 1024,
  },
  // Images
  'image/jpeg': { ext: '.jpg', maxSize: 5 * 1024 * 1024 }, // 5MB
  'image/png': { ext: '.png', maxSize: 5 * 1024 * 1024 },
};

const MAX_FILENAME_LENGTH = 255;

function sanitizeFilename(filename: string): string {
  const basename = path.basename(filename).replace(/\0/g, '');
  const sanitized = basename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '_')
    .substring(0, MAX_FILENAME_LENGTH);
  return sanitized || 'unnamed_file';
}

export const POST = withAuth(USER_ROLES.EMPLOYEE)(
  async (req: NextRequest) => {
    try {
      // Extract user information from headers
      const userId = req.headers.get('x-user-id')!;
      const userCompanyId = req.headers.get('x-company-id')!;

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const fileType = file.type.toLowerCase();
    const fileConfig =
      ALLOWED_FILE_TYPES[fileType as keyof typeof ALLOWED_FILE_TYPES];

    if (!fileConfig) {
      return NextResponse.json(
        { error: 'File type not allowed' },
        { status: 400 },
      );
    }

    if (file.size > fileConfig.maxSize) {
      return NextResponse.json(
        {
          error: `File size exceeds maximum of ${fileConfig.maxSize / 1024 / 1024}MB`,
        },
        { status: 400 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const sanitizedName = sanitizeFilename(file.name);
    const fileId = crypto.randomBytes(16).toString('hex');
    const destination = `documents/${fileId}_${sanitizedName}`;

    // Upload to Azure Blob Storage
    const storageServices = getStorageServices();
    const uploadResult = await storageServices.documents.uploadFile(
      buffer,
      destination,
      file.type
    );
    const publicUrl = uploadResult.url;

    const fileDoc = {
      fileId,
      originalName: file.name,
      sanitizedName,
      path: destination,
      publicUrl,
      mimeType: file.type,
      size: file.size,
      uploadedBy: userId,
      status: 'uploaded',
      createdAt: new Date().toISOString(),
    };

    // Store file metadata in Cosmos DB
    const container = await getContainer('documents');
    await container.items.create({
      id: fileId,
      ...fileDoc,
      partitionKey: userId
    });

    return NextResponse.json({
      message: 'File uploaded successfully',
      fileId,
      path: destination,
      publicUrl,
    });
  } catch (error) {
    console.error('Upload Error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file.' },
      { status: 500 },
    );
  }
});
