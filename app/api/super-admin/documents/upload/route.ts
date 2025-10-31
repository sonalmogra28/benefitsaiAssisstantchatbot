export const dynamic = 'force-dynamic';

import { type NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/lib/azure/cosmos-db';
import { adminAuth } from '@/lib/auth/admin-auth';
import { requireCompanyAdmin } from '@/lib/auth/unified-auth';
import crypto from 'crypto';

export const POST = requireCompanyAdmin(async (request: NextRequest) => {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);

    if (decodedToken.super_admin !== true) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { fileName, fileType, downloadURL, storagePath } =
      await request.json();

    // Store document metadata in Cosmos DB
    const documentsContainer = await getContainer('documents');
    const docRef = await documentsContainer.items.create({
      id: crypto.randomUUID(),
      userId: decodedToken.uid,
      title: fileName,
      fileName,
      fileType,
      storagePath,
      downloadURL,
      status: 'uploaded',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      partitionKey: decodedToken.uid
    });

    return NextResponse.json({
      id: docRef.resource?.id || 'unknown',
      message: 'Document created successfully',
    });
  } catch (error) {
    console.error('Error creating document in Firestore:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
});

