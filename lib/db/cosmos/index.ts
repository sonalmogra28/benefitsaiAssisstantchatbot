/**
 * Cosmos DB Module Exports
 * Central export point for database operations
 */

// Client and operations
export {
  getCosmosClient,
  getDatabase,
  CosmosContainers,
  checkCosmosHealth,
  closeCosmosConnection,
} from './client';

export {
  CosmosOperations,
  buildQuery,
  type CosmosDocument,
  type PaginatedResult,
  type QueryOptions,
} from './operations';

// Repositories
export {
  DocumentsRepository,
  type BenefitDocument,
  type CreateDocumentInput,
  type UpdateDocumentInput,
  type VersionHistory,
} from './repositories/documents.repository';

export {
  ConversationsRepository,
  type ConversationDocument,
  type ConversationMessage,
} from './repositories/conversations.repository';
