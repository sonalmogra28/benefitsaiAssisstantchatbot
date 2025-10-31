/**
 * Cosmos DB Type Definitions
 * 
 * Aligned with schema defined in docs/AZURE_COSMOS_SCHEMA.md
 */

/**
 * Base document interface - all Cosmos documents must extend this
 */
export interface CosmosDocument {
  id: string;
  _etag?: string;
  _ts?: number;
}

/**
 * Multi-tenant partition key interface
 */
export interface PartitionedDocument extends CosmosDocument {
  companyId: string;
}

/**
 * Document versioning interface
 */
export interface VersionedDocument {
  version: {
    current: number;
    history: VersionHistory[];
  };
}

export interface VersionHistory {
  version: number;
  timestamp: string;
  userId: string;
  changes: string;
  snapshot?: string; // Full document snapshot (optional)
}

/**
 * Company document
 */
export interface CompanyDocument extends CosmosDocument {
  name: string;
  domain: string;
  tier: 'starter' | 'professional' | 'enterprise';
  features: {
    maxUsers: number;
    maxDocuments: number;
    aiModels: string[];
    customBranding: boolean;
  };
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'suspended' | 'trial';
}

/**
 * User document
 */
export interface UserDocument extends PartitionedDocument {
  email: string;
  name: string;
  role: 'employee' | 'hr_admin' | 'company_admin' | 'super_admin';
  department?: string;
  enrollmentStatus: 'not_started' | 'in_progress' | 'completed';
  preferences: {
    notifications: boolean;
    language: string;
  };
  createdAt: string;
  lastLoginAt?: string;
}

/**
 * Document (benefit plan) document
 */
export interface DocumentDocument extends PartitionedDocument, VersionedDocument {
  title: string;
  type: 'policy' | 'benefit_plan' | 'faq' | 'guide';
  content: string; // HTML from TipTap editor
  metadata: {
    author: string;
    tags: string[];
    category: string;
  };
  embedding?: number[]; // Vector embedding for AI search
  processingStatus: 'pending' | 'processing' | 'ready' | 'failed';
  createdAt: string;
  updatedAt: string;
}

/**
 * Conversation document
 */
export interface ConversationDocument extends PartitionedDocument {
  userId: string;
  sessionId: string;
  messages: ConversationMessage[];
  qualityMetrics?: {
    responseTime: number;
    groundingScore: number;
    escalationTier: 'L1' | 'L2' | 'L3';
    resolved: boolean;
  };
  createdAt: string;
  updatedAt: string;
  ttl?: number; // Auto-delete after 1 year (31536000 seconds)
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  reasoning?: string; // Chain-of-thought reasoning
}

/**
 * User survey document
 */
export interface UserSurveyDocument extends PartitionedDocument {
  userId: string;
  conversationId: string;
  ratings: {
    csat: number; // 1-5
    nps: number; // 0-10
  };
  feedback?: string;
  tags: string[]; // Auto-generated sentiment tags
  createdAt: string;
}

/**
 * Analytics daily aggregation document
 */
export interface AnalyticsDailyDocument extends PartitionedDocument {
  date: string; // YYYY-MM-DD
  metrics: {
    totalConversations: number;
    avgResponseTime: number;
    avgGroundingScore: number;
    avgCsat: number;
    avgNps: number;
    resolutionRate: number;
    escalationRate: number;
    cacheHitRate: number;
    totalCost: number;
  };
  topTopics: Array<{ topic: string; count: number }>;
}

/**
 * Audit log document
 */
export interface AuditLogDocument extends PartitionedDocument {
  action: string;
  userId: string;
  resourceType: 'document' | 'user' | 'company' | 'conversation';
  resourceId: string;
  changes?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
  ttl?: number; // Auto-delete after 7 years (220752000 seconds)
}

/**
 * Query pagination result
 */
export interface PaginatedResult<T> {
  items: T[];
  continuationToken?: string;
  hasMore: boolean;
  totalCount?: number;
}

/**
 * Query options
 */
export interface QueryOptions {
  maxItems?: number;
  continuationToken?: string;
  partitionKey?: string;
}
