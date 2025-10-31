import { logger } from '@/lib/logger';
import { getClient } from '@/lib/azure/cosmos';

const isBuild = () => process.env.NEXT_PHASE === 'phase-production-build';

export interface UploadResult {
  id: string;
  url: string;
  filename: string;
  size: number;
  contentType: string;
}

class DocumentUploadService {
  private container: any = null;

  private async ensureInitialized() {
    if (isBuild()) return;
    if (this.container) return;
    
    const client = await getClient();
    if (!client) return;
    
    this.container = client.database('BenefitsDB').container('documents');
  }

  async uploadDocument(
    file: File,
    companyId: string,
    metadata: Record<string, any> = {}
  ): Promise<UploadResult> {
    await this.ensureInitialized();
    try {
      const documentId = crypto.randomUUID();
      const filename = file.name;
      const contentType = file.type;
      const size = file.size;

      // Create document record
      const documentRecord = {
        id: documentId,
        companyId,
        filename,
        contentType,
        size,
        status: 'uploaded',
        uploadedAt: new Date().toISOString(),
        ...metadata
      };

      await this.container.items.create(documentRecord);

      logger.info({
        documentId,
        filename,
        companyId,
        size
      }, 'Document uploaded successfully');

      return {
        id: documentId,
        url: `/api/documents/${documentId}`,
        filename,
        size,
        contentType
      };

    } catch (error) {
      logger.error({ error, filename: file.name, companyId }, 'Document upload failed');
      throw error;
    }
  }

  async getDocument(documentId: string): Promise<any> {
    await this.ensureInitialized();
    try {
      const { resource } = await this.container.item(documentId).read();
      return resource;
    } catch (error) {
      if ((error as any).code === 404) {
        return null;
      }
      logger.error({ error, documentId }, 'Failed to get document');
      throw error;
    }
  }

  async deleteDocument(documentId: string): Promise<void> {
    await this.ensureInitialized();
    try {
      await this.container.item(documentId).delete();
      logger.info({ documentId }, 'Document deleted');
    } catch (error) {
      logger.error({ error, documentId }, 'Failed to delete document');
      throw error;
    }
  }
}

export const documentUploadService = new DocumentUploadService();
