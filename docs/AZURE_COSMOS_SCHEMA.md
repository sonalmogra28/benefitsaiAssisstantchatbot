# Azure Cosmos DB Schema Design for Benefits AI Assistant
**Version:** 1.0  
**Date:** October 31, 2025  
**Status:** Production-Ready Schema

---

## Overview

Multi-tenant Azure Cosmos DB schema optimized for:
- **Analytics** (conversation quality, user satisfaction, performance metrics)
- **Document Management** (version control, audit trails)
- **Multi-Tenancy** (company isolation with shared infrastructure)
- **Global Distribution** (low-latency access across regions)
- **Scalability** (automatic partitioning and throughput management)

**Database:** `benefitsai-production`  
**API:** Core (SQL)  
**Consistency Level:** Session (default) or Eventual (for analytics reads)

---

## Containers

### 1. `companies`
**Partition Key:** `/id`  
**Throughput:** 400 RU/s (autoscale to 4000)

```typescript
interface Company {
  id: string;                    // Partition key
  type: 'company';               // Discriminator for queries
  name: string;
  domain: string;                // Email domain (e.g., "amerivet.com")
  plan: 'basic' | 'premium' | 'enterprise';
  settings: {
    enabledFeatures: string[];
    llmTierDefaults: {
      maxL1Percentage: number;
      maxL3Percentage: number;
    };
    branding: {
      logoUrl?: string;
      primaryColor?: string;
      secondaryColor?: string;
    };
  };
  metadata: {
    employeeCount: number;
    industry: string;
    contactEmail: string;
  };
  createdAt: string;             // ISO 8601
  updatedAt: string;
  status: 'active' | 'suspended' | 'trial';
  _ts: number;                   // Cosmos DB timestamp
}
```

**Indexes:**
- Default: All properties indexed
- Composite: `[(status, ASC), (createdAt, DESC)]`

---

### 2. `users`
**Partition Key:** `/companyId`  
**Throughput:** 1000 RU/s (autoscale to 10000)

```typescript
interface User {
  id: string;                    // Azure AD B2C user ID
  companyId: string;             // Partition key (multi-tenant isolation)
  type: 'user';
  email: string;
  name: string;
  roles: string[];
  permissions: string[];
  profile: {
    avatarUrl?: string;
    department?: string;
    jobTitle?: string;
    enrollmentStatus: 'pending' | 'active' | 'declined';
  };
  preferences: {
    locale: string;
    notifications: boolean;
    theme: 'light' | 'dark' | 'auto';
  };
  metadata: {
    lastLoginAt?: string;
    loginCount: number;
    conversationCount: number;
  };
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'inactive' | 'deleted';
  _ts: number;
}
```

**Indexes:**
- Composite: `[(companyId, ASC), (status, ASC), (email, ASC)]`
- Composite: `[(companyId, ASC), (roles, ASC), (createdAt, DESC)]`

---

### 3. `documents`
**Partition Key:** `/companyId`  
**Throughput:** 2000 RU/s (autoscale to 20000)

```typescript
interface Document {
  id: string;
  companyId: string;             // Partition key
  type: 'document';
  title: string;
  documentType: 'pdf' | 'docx' | 'html' | 'markdown';
  category: 'handbook' | 'policy' | 'faq' | 'plan_summary' | 'form';
  content: {
    raw: string;
    processed: string;
    chunks: number;
  };
  version: {
    current: number;
    history: VersionHistory[];
    isLatest: boolean;
  };
  metadata: {
    author: string;
    benefitYear?: number;
    carrier?: string;
    planType?: string;
    effectiveDate?: string;
    expirationDate?: string;
    tags: string[];
    fileSize: number;
    mimeType: string;
  };
  permissions: {
    roles: string[];
    visibility: 'public' | 'internal' | 'restricted';
  };
  analytics: {
    viewCount: number;
    downloadCount: number;
    citationCount: number;
    lastAccessedAt?: string;
  };
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  status: 'draft' | 'published' | 'archived' | 'deleted';
  _ts: number;
}

interface VersionHistory {
  version: number;
  timestamp: string;
  author: string;
  changelog: string;
  contentHash: string;           // SHA-256
  changes: {
    added: number;
    modified: number;
    deleted: number;
  };
}
```

**Indexes:**
- Composite: `[(companyId, ASC), (status, ASC), (createdAt, DESC)]`
- Composite: `[(companyId, ASC), (category, ASC), (metadata.benefitYear, DESC)]`
- Composite: `[(companyId, ASC), (version.isLatest, ASC), (updatedAt, DESC)]`

**TTL:** Soft-delete with 90-day retention for `status: 'deleted'`

---

### 4. `conversations`
**Partition Key:** `/companyId`  
**Throughput:** 5000 RU/s (autoscale to 50000) - High volume container

```typescript
interface Conversation {
  id: string;                    // conversation-{timestamp}-{random}
  companyId: string;             // Partition key
  type: 'conversation';
  userId: string;
  sessionId: string;
  messages: Message[];
  quality: {
    conversationId: string;
    responseTime: number;
    groundingScore: number;
    userSatisfactionRating?: number;
    escalationCount: number;
    resolvedFirstContact: boolean;
    tier: 'L1' | 'L2' | 'L3';
    cacheHit: boolean;
    timestamp: number;
    queryLength: number;
    answerLength: number;
  };
  summary: {
    intent: string;
    topics: string[];
    resolved: boolean;
    resolutionType: 'answered' | 'escalated' | 'needs_human';
  };
  metadata: {
    userAgent: string;
    ipAddress: string;
    locale: string;
    source: 'web' | 'mobile' | 'api';
  };
  createdAt: string;
  completedAt?: string;
  status: 'active' | 'completed' | 'abandoned';
  _ts: number;
  ttl?: number;                  // Archive after 1 year (31536000 seconds)
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: {
    tier?: 'L1' | 'L2' | 'L3';
    latency?: number;
    citationCount?: number;
    tokens?: {
      prompt: number;
      completion: number;
    };
  };
}
```

**Indexes:**
- Composite: `[(companyId, ASC), (userId, ASC), (createdAt, DESC)]`
- Composite: `[(companyId, ASC), (status, ASC), (createdAt, DESC)]`
- Composite: `[(companyId, ASC), (quality.tier, ASC), (createdAt, DESC)]`

**TTL:** Enabled (31536000 seconds = 1 year for archived conversations)

---

### 5. `user_surveys`
**Partition Key:** `/companyId`  
**Throughput:** 1000 RU/s (autoscale to 10000)

```typescript
interface UserSurvey {
  id: string;                    // surveyId
  companyId: string;             // Partition key
  type: 'survey';
  conversationId: string;
  userId: string;
  csatRating: number;            // 1-5 stars
  npsScore: number;              // 0-10 scale
  feedback?: string;
  timestamp: number;
  createdAt: string;
  source: 'inline' | 'post_conversation' | 'email';
  tags: string[];
  _ts: number;
}
```

**Indexes:**
- Composite: `[(companyId, ASC), (userId, ASC), (timestamp, DESC)]`
- Composite: `[(companyId, ASC), (npsScore, ASC), (timestamp, DESC)]`
- Composite: `[(conversationId, ASC)]`

---

### 6. `analytics_daily`
**Partition Key:** `/companyId`  
**Throughput:** 400 RU/s (autoscale to 4000)

```typescript
interface DailyAnalytics {
  id: string;                    // {companyId}-{YYYY-MM-DD}
  companyId: string;             // Partition key
  type: 'analytics_daily';
  date: string;                  // YYYY-MM-DD
  metrics: {
    conversations: {
      total: number;
      byTier: { L1: number; L2: number; L3: number };
      escalated: number;
      cached: number;
      avgResponseTime: number;
      p95ResponseTime: number;
    };
    quality: {
      avgGroundingScore: number;
      belowThreshold: number;
      avgEscalationCount: number;
      firstContactResolutionRate: number;
    };
    satisfaction: {
      avgCSAT: number;
      avgNPS: number;
      surveyCount: number;
      promoters: number;
      passives: number;
      detractors: number;
    };
    cost: {
      total: number;
      byTier: { L1: number; L2: number; L3: number };
      avgPerConversation: number;
    };
    topTopics: Array<{ topic: string; count: number }>;
    peakHours: Array<{ hour: number; count: number }>;
  };
  createdAt: string;
  generatedAt: string;
  _ts: number;
}
```

**Indexes:**
- Composite: `[(companyId, ASC), (date, DESC)]`
- Default indexing for all metrics fields

---

### 7. `audit_logs`
**Partition Key:** `/companyId`  
**Throughput:** 400 RU/s (autoscale to 4000)

```typescript
interface AuditLog {
  id: string;
  companyId: string;             // Partition key
  type: 'audit_log';
  userId: string;
  action: 'create' | 'update' | 'delete' | 'view' | 'download' | 'export';
  resource: {
    type: 'document' | 'user' | 'conversation' | 'settings';
    id: string;
    before?: any;
    after?: any;
  };
  metadata: {
    ipAddress: string;
    userAgent: string;
    requestId: string;
  };
  timestamp: string;
  severity: 'info' | 'warning' | 'critical';
  _ts: number;
  ttl?: number;                  // Archive after 7 years (220752000 seconds)
}
```

**Indexes:**
- Composite: `[(companyId, ASC), (timestamp, DESC)]`
- Composite: `[(userId, ASC), (timestamp, DESC)]`
- Composite: `[(severity, ASC), (timestamp, DESC)]`

**TTL:** Enabled (7-year retention for compliance)

---

## Azure Cosmos DB Configuration

### Database Settings
```json
{
  "id": "benefitsai-production",
  "throughput": null,
  "autoscaleSettings": null,
  "enableAnalyticalStorage": true
}
```

### Global Distribution
- **Primary Region:** East US 2
- **Secondary Regions:** West US 2, Central US (for high availability)
- **Multi-region writes:** Disabled (single-write region for cost optimization)

### Backup Policy
- **Mode:** Continuous (7-day point-in-time restore)
- **Retention:** 30 days
- **Geo-redundancy:** Enabled

---

## SDK Integration Example

### Initialize Cosmos Client

```typescript
import { CosmosClient, Container } from '@azure/cosmos';

const endpoint = process.env.AZURE_COSMOS_ENDPOINT!;
const key = process.env.AZURE_COSMOS_KEY!;

const client = new CosmosClient({ endpoint, key });
const database = client.database('benefitsai-production');

export const containers = {
  companies: database.container('companies'),
  users: database.container('users'),
  documents: database.container('documents'),
  conversations: database.container('conversations'),
  userSurveys: database.container('user_surveys'),
  analyticsDaily: database.container('analytics_daily'),
  auditLogs: database.container('audit_logs'),
};
```

### Query Examples

```typescript
// Get user conversations with pagination
async function getUserConversations(
  companyId: string,
  userId: string,
  continuationToken?: string
) {
  const querySpec = {
    query: `
      SELECT * FROM c 
      WHERE c.companyId = @companyId 
        AND c.userId = @userId 
        AND c.type = 'conversation'
      ORDER BY c.createdAt DESC
    `,
    parameters: [
      { name: '@companyId', value: companyId },
      { name: '@userId', value: userId },
    ],
  };

  const { resources, continuationToken: nextToken } = await containers.conversations.items
    .query(querySpec, { 
      maxItemCount: 20,
      continuationToken 
    })
    .fetchNext();

  return { conversations: resources, continuationToken: nextToken };
}

// Save conversation with quality metrics
async function saveConversation(conversation: Conversation) {
  await containers.conversations.items.create(conversation);
}

// Get daily analytics
async function getDailyAnalytics(companyId: string, startDate: string, endDate: string) {
  const querySpec = {
    query: `
      SELECT * FROM c 
      WHERE c.companyId = @companyId 
        AND c.type = 'analytics_daily'
        AND c.date >= @startDate 
        AND c.date <= @endDate
      ORDER BY c.date DESC
    `,
    parameters: [
      { name: '@companyId', value: companyId },
      { name: '@startDate', value: startDate },
      { name: '@endDate', value: endDate },
    ],
  };

  const { resources } = await containers.analyticsDaily.items
    .query(querySpec)
    .fetchAll();

  return resources;
}
```

---

## Change Feed for Real-Time Processing

```typescript
import { ChangeFeedIterator } from '@azure/cosmos';

// Process conversation changes for real-time analytics
async function processConversationChanges() {
  const iterator: ChangeFeedIterator<Conversation> = containers.conversations.items
    .readChangeFeed({
      startTime: new Date(),
    });

  while (iterator.hasMoreResults) {
    const response = await iterator.readNext();
    
    for (const conversation of response.resources) {
      // Update real-time metrics
      await updateRealtimeMetrics(conversation);
    }
  }
}
```

---

## Cost Optimization

### Provisioned Throughput Strategy
- **Companies:** 400 RU/s (low write volume)
- **Users:** 1000 RU/s (moderate read/write)
- **Documents:** 2000 RU/s (moderate write, high read)
- **Conversations:** 5000 RU/s (high volume, autoscale to 50K)
- **Surveys:** 1000 RU/s (moderate volume)
- **Analytics:** 400 RU/s (batch writes)
- **Audit Logs:** 400 RU/s (append-only)

**Total Base:** ~10,200 RU/s ≈ **$600/month**

### Autoscale Benefits
- Scale up during peak hours (9 AM - 5 PM)
- Scale down during off-hours
- **Estimated savings:** 40-60% vs manual provisioning

### Additional Optimizations
- Use analytical store for historical analytics (no RU consumption)
- Implement caching layer (Redis) for hot data
- Archive old conversations with TTL
- Use bulk operations for batch inserts

---

## Migration from Current System

### Phase 1: Schema Setup
1. Create Cosmos DB account (SQL API)
2. Create database and containers
3. Configure indexes and TTL policies
4. Set up multi-region replication

### Phase 2: Data Migration
1. Export existing data (if any)
2. Transform to Cosmos DB schema
3. Bulk import using Azure Data Factory
4. Validate data integrity

### Phase 3: Application Integration
1. Install `@azure/cosmos` SDK
2. Update data access layer
3. Implement change feed listeners
4. Deploy and test

### Phase 4: Monitoring
1. Enable Azure Monitor integration
2. Set up alerts (RU consumption, latency)
3. Configure Application Insights correlation
4. Implement cost tracking dashboard

---

## Performance Targets

- **Conversation Write:** <10ms (p95) - within partition
- **User Query:** <20ms (p95) - single partition
- **Analytics Query:** <100ms (p95) - pre-aggregated
- **Cross-partition Query:** <500ms (p95) - with indexes

---

## Security

- **Network:** Private endpoints (VNet integration)
- **Authentication:** Azure AD managed identity
- **Encryption:** At rest (Microsoft-managed keys) + in transit (TLS 1.2+)
- **Access Control:** RBAC with least privilege
- **Firewall:** IP whitelist for production environments
- **Audit:** Enable diagnostic logging to Log Analytics

---

**Next Steps:**
1. ✅ Provision Azure Cosmos DB account
2. ✅ Create containers with indexes
3. ⚠️ Implement SDK client wrappers
4. ⚠️ Set up change feed processors
5. ⚠️ Integrate with RAG pipeline
