import { BlobServiceClient } from '@azure/storage-blob';

export interface StorageFile {
  url: string;
  fileName: string;
  name: string;
}

export const getStorageServices = () => {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connectionString) {
    throw new Error('AZURE_STORAGE_CONNECTION_STRING is not defined in environment variables.');
  }
  
  const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
  
  return {
    documents: {
      uploadFile: async (file: Buffer, fileName: string, contentType: string): Promise<StorageFile> => {
        const containerClient = blobServiceClient.getContainerClient('documents');
        await containerClient.createIfNotExists();
        const blockBlobClient = containerClient.getBlockBlobClient(fileName);
        await blockBlobClient.uploadData(file, { 
          blobHTTPHeaders: { blobContentType: contentType } 
        });
        return { 
          url: blockBlobClient.url, 
          fileName,
          name: fileName
        };
      },
      
      deleteFile: async (fileName: string): Promise<void> => {
        const containerClient = blobServiceClient.getContainerClient('documents');
        const blockBlobClient = containerClient.getBlockBlobClient(fileName);
        await blockBlobClient.deleteIfExists();
      },
      
      getFileUrl: (fileName: string): string => {
        const containerClient = blobServiceClient.getContainerClient('documents');
        const blockBlobClient = containerClient.getBlockBlobClient(fileName);
        return blockBlobClient.url;
      },
      
      downloadFile: async (fileName: string): Promise<Buffer> => {
        const containerClient = blobServiceClient.getContainerClient('documents');
        const blockBlobClient = containerClient.getBlockBlobClient(fileName);
        const downloadResponse = await blockBlobClient.download();
        const chunks: Uint8Array[] = [];
        for await (const chunk of downloadResponse.readableStreamBody!) {
          chunks.push(chunk instanceof Uint8Array ? chunk : new Uint8Array(Buffer.from(chunk)));
        }
        return Buffer.concat(chunks);
      },
    },
    images: {
      uploadFile: async (file: Buffer, fileName: string, contentType: string): Promise<StorageFile> => {
        const containerClient = blobServiceClient.getContainerClient('images');
        await containerClient.createIfNotExists();
        const blockBlobClient = containerClient.getBlockBlobClient(fileName);
        await blockBlobClient.uploadData(file, { 
          blobHTTPHeaders: { blobContentType: contentType } 
        });
        return { 
          url: blockBlobClient.url, 
          fileName,
          name: fileName
        };
      },
      
      deleteFile: async (fileName: string): Promise<void> => {
        const containerClient = blobServiceClient.getContainerClient('images');
        const blockBlobClient = containerClient.getBlockBlobClient(fileName);
        await blockBlobClient.deleteIfExists();
      },
      
      getFileUrl: (fileName: string): string => {
        const containerClient = blobServiceClient.getContainerClient('images');
        const blockBlobClient = containerClient.getBlockBlobClient(fileName);
        return blockBlobClient.url;
      },
    },
  };
};
