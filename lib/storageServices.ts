// lib/storageServices.ts
import { BlobServiceClient } from "@azure/storage-blob";

const accountBase = process.env.NEXT_PUBLIC_BLOB_BASE_URL; // e.g. https://<acct>.blob.core.windows.net
const docContainer = process.env.AZURE_BLOB_CONTAINER_DOCUMENTS || "documents";
const imgContainer = process.env.AZURE_BLOB_CONTAINER_IMAGES || "images";

function getBlobServiceClient() {
  if (process.env.AZURE_STORAGE_CONNECTION_STRING) {
    return BlobServiceClient.fromConnectionString(
      process.env.AZURE_STORAGE_CONNECTION_STRING
    );
  }
  if (process.env.AZURE_STORAGE_SAS_URL) {
    return new BlobServiceClient(process.env.AZURE_STORAGE_SAS_URL);
  }
  throw new Error("No Azure Storage credentials configured.");
}

async function putFile(
  containerName: string,
  data: Buffer,
  blobName: string,
  contentType: string
) {
  const svc = getBlobServiceClient();
  const container = svc.getContainerClient(containerName);
  await container.createIfNotExists();
  const block = container.getBlockBlobClient(blobName);
  await block.uploadData(data, { blobHTTPHeaders: { blobContentType: contentType } });
  return {
    container: containerName,
    blobName,
    url: `${accountBase}/${containerName}/${encodeURI(blobName)}`
  };
}

function delFile(containerName: string, blobName: string) {
  const svc = getBlobServiceClient();
  const container = svc.getContainerClient(containerName);
  return container.deleteBlob(blobName);
}

function fileUrl(containerName: string, blobName: string) {
  return `${accountBase}/${containerName}/${encodeURI(blobName)}`;
}

export type StorageFile = {
  container: string;
  blobName: string;
  url: string;
};

export const storageServices = {
  documents: {
    uploadFile: (file: Buffer, fileName: string, contentType: string) =>
      putFile(docContainer, file, fileName, contentType),
    deleteFile: (fileName: string) => delFile(docContainer, fileName),
    getFileUrl: (fileName: string) => fileUrl(docContainer, fileName),
  },
  images: {
    uploadFile: (file: Buffer, fileName: string, contentType: string) =>
      putFile(imgContainer, file, fileName, contentType),
    deleteFile: (fileName: string) => delFile(imgContainer, fileName),
    getFileUrl: (fileName: string) => fileUrl(imgContainer, fileName),
  },
};
