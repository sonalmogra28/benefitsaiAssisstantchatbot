import { BlobServiceClient } from '@azure/storage-blob';

const isBuild = () => process.env.NEXT_PHASE === 'phase-production-build';

let blobServiceClient: BlobServiceClient | null = null;

async function getBlobServiceClient(): Promise<BlobServiceClient | null> {
  if (isBuild()) return null;
  if (blobServiceClient) return blobServiceClient;
  
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connectionString) {
    console.warn('Azure Storage connection string not configured');
    return null;
  }
  
  blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
  return blobServiceClient;
}

export const DOCUMENTS_CONTAINER_NAME = 'documents';

export async function getContainerClient(containerName: string) {
  const client = await getBlobServiceClient();
  if (!client) return null;
  
  const containerClient = client.getContainerClient(containerName);
  await containerClient.createIfNotExists();
  return containerClient;
}

export default getBlobServiceClient;
