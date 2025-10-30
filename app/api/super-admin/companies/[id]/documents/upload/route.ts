// app/api/super-admin/companies/[id]/documents/upload/route.ts
import { type NextRequest, NextResponse } from 'next/server';
import { getStorageServices } from '@/lib/azure/storage';
import { requireSuperAdmin } from '@/lib/auth/unified-auth';

const storageServices = getStorageServices();

export const POST = requireSuperAdmin(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Upload to Azure Blob Storage
    const fileBuffer = await file.arrayBuffer();
    const fileName = `${id}/${file.name}`;
    
    const uploadResult = await storageServices.documents.uploadFile(
      Buffer.from(fileBuffer),
      fileName,
      file.type
    );

    return NextResponse.json({ 
      success: true, 
      url: uploadResult.url,
      fileName: uploadResult.name
    });
  },
);
