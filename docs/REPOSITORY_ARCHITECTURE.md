# Cosmos DB Repository Pattern & Security Architecture

This document describes the production-grade architecture implemented for database operations, API security, and document versioning.

## 📁 Directory Structure

```
lib/
├── db/
│   └── cosmos/
│       ├── client.ts                    # Singleton Cosmos client with connection pooling
│       ├── types.ts                     # TypeScript interfaces for all documents
│       └── repositories/
│           ├── base.repository.ts       # Base repository with CRUD operations
│           └── document.repository.ts   # Document-specific repository with versioning
└── security/
    └── rate-limit.ts                    # Rate limiting middleware with token bucket algorithm

app/api/
├── documents/
│   ├── route.ts                         # List and create documents (with rate limiting)
│   └── [id]/
│       └── versions/
│           └── route.ts                 # Version history and rollback endpoints
```

## 🏗️ Architecture Patterns

### 1. Repository Pattern

**Why**: Separates data access logic from business logic, making code testable and maintainable.

**Benefits**:
- ✅ Single source of truth for database operations
- ✅ Type-safe operations with TypeScript generics
- ✅ Centralized error handling
- ✅ Easy to mock for testing
- ✅ Consistent pagination and query patterns

**Example Usage**:
```typescript
import { documentRepository } from '@/lib/db/cosmos/repositories/document.repository';

// Create document with versioning
const doc = await documentRepository.createDocument(
  {
    title: 'Employee Benefits Guide',
    type: 'benefit_plan',
    content: '<h1>Benefits</h1>...',
    metadata: { author: 'admin', tags: ['benefits'], category: 'hr' },
    processingStatus: 'pending',
  },
  'user-123', // userId
  'company-456' // companyId (partition key)
);

// Update with version increment
const updated = await documentRepository.updateDocument(
  doc.id!,
  { content: '<h1>Updated Benefits</h1>...' },
  'user-123',
  'Updated benefits section',
  'company-456'
);

// Rollback to previous version
const rolledBack = await documentRepository.rollbackToVersion(
  doc.id!,
  1, // target version
  'user-123',
  'company-456'
);
```

### 2. Document Versioning

**Why**: Track changes to benefit documents over time, enable rollback, and maintain audit trail.

**Features**:
- ✅ Automatic version increment on updates
- ✅ Full content snapshots in version history
- ✅ Rollback to any previous version
- ✅ User attribution for all changes
- ✅ Change descriptions

**Version Structure**:
```typescript
{
  id: 'doc-123',
  title: 'Benefits Plan',
  content: '<h1>Current Content</h1>',
  version: {
    current: 3,
    history: [
      {
        version: 1,
        timestamp: '2025-10-30T10:00:00Z',
        userId: 'user-123',
        changes: 'Initial document creation',
        snapshot: '<h1>Original Content</h1>'
      },
      {
        version: 2,
        timestamp: '2025-10-30T14:30:00Z',
        userId: 'user-456',
        changes: 'Updated coverage details',
        snapshot: '<h1>Updated Content</h1>'
      },
      {
        version: 3,
        timestamp: '2025-10-31T09:15:00Z',
        userId: 'user-123',
        changes: 'Added FAQ section',
        snapshot: '<h1>Current Content</h1>'
      }
    ]
  }
}
```

### 3. Rate Limiting Middleware

**Why**: Protect APIs from abuse, ensure fair usage, and prevent DoS attacks.

**Features**:
- ✅ Token bucket algorithm (industry standard)
- ✅ Per-IP, per-user, or per-API-key limiting
- ✅ Tier-based limits (Free, Professional, Enterprise)
- ✅ Standard rate limit headers (X-RateLimit-*)
- ✅ In-memory store (Redis-compatible for production)
- ✅ Automatic cleanup of expired entries

**Usage**:
```typescript
import { rateLimit, RATE_LIMITS } from '@/lib/security/rate-limit';

// Apply to API route
export const GET = rateLimit(RATE_LIMITS.PROFESSIONAL)(async (req: NextRequest) => {
  // Your API logic here
  return NextResponse.json({ success: true });
});

// Custom rate limit
export const POST = rateLimit({
  maxRequests: 100,
  windowSeconds: 60,
  identifierType: 'user',
})(async (req: NextRequest) => {
  // Your API logic here
});
```

**Rate Limit Tiers**:
| Tier | Requests/Minute | Identifier |
|------|-----------------|------------|
| Free | 100 | IP Address |
| Professional | 500 | User ID |
| Enterprise | 2000 | User ID |
| Auth Endpoints | 10 | IP Address |
| Public API | 60 | IP Address |

**Response Headers**:
```
X-RateLimit-Limit: 500
X-RateLimit-Remaining: 485
X-RateLimit-Reset: 1698765432
Retry-After: 42  (only when limit exceeded)
```

## 🔒 Security Best Practices

### 1. Cosmos DB Security

✅ **Implemented**:
- Singleton client pattern (connection pooling)
- Session consistency for read-your-writes
- Partition key isolation (multi-tenant)
- Optimistic concurrency with etag
- Request timeout (10 seconds)
- Retry policies (3 attempts, 300ms delay)

🔜 **Production Enhancements**:
- [ ] Use Azure Managed Identity instead of connection string
- [ ] Enable private endpoints (VNet integration)
- [ ] Configure IP firewall rules
- [ ] Enable diagnostic logging to Azure Monitor
- [ ] Set up alerts for RU consumption spikes

### 2. API Security

✅ **Implemented**:
- Rate limiting on all public endpoints
- Input validation
- Error message sanitization
- HTTPS enforcement (Next.js default)

🔜 **Production Enhancements**:
- [ ] JWT authentication middleware
- [ ] API key rotation
- [ ] Request signature validation
- [ ] CORS configuration per environment
- [ ] SQL injection prevention (parameterized queries)

### 3. Data Security

✅ **Implemented**:
- Partition key scoping (company isolation)
- Version history for audit trail
- TTL for automatic data cleanup

🔜 **Production Enhancements**:
- [ ] Encryption at rest (Cosmos DB default)
- [ ] Field-level encryption for PII
- [ ] GDPR compliance (data export/deletion)
- [ ] Access logging to audit container

## 📊 Performance Optimizations

### 1. Query Pagination

**Why**: Prevent memory exhaustion and reduce RU consumption.

```typescript
// Paginated query with continuation token
const result = await documentRepository.getDocumentsByCompany(
  'company-123',
  20, // maxItems
  continuationToken // from previous request
);

console.log(result.items); // Current page
console.log(result.continuationToken); // Next page token
console.log(result.hasMore); // More results available?
```

**Benefits**:
- ✅ Lower RU consumption (pay per page, not all results)
- ✅ Faster response times
- ✅ Better UX with progressive loading
- ✅ Prevents timeout on large datasets

### 2. Partition Key Strategy

**Multi-tenant Isolation**:
```typescript
// All queries scoped to company
const docs = await documentRepository.getDocumentsByCompany('company-123');

// Partition key passed to all operations
await documentRepository.findById('doc-id', 'company-123');
await documentRepository.update('doc-id', updates, 'company-123');
```

**Benefits**:
- ✅ Predictable RU consumption (no cross-partition queries)
- ✅ Data isolation between tenants
- ✅ Horizontal scalability
- ✅ Lower latency (within-partition queries)

### 3. Connection Pooling

**Singleton Client Pattern**:
```typescript
// Single Cosmos client reused across requests
export function getCosmosClient(): CosmosClient {
  if (!cosmosClient) {
    cosmosClient = new CosmosClient(cosmosConfig);
  }
  return cosmosClient;
}
```

**Benefits**:
- ✅ Reduced connection overhead
- ✅ Lower memory usage
- ✅ Better throughput
- ✅ Automatic connection retry

## 🧪 Testing

### Unit Tests (Recommended)

```typescript
// test/repositories/document.repository.test.ts
import { documentRepository } from '@/lib/db/cosmos/repositories/document.repository';

describe('DocumentRepository', () => {
  it('should create document with version 1', async () => {
    const doc = await documentRepository.createDocument(
      { title: 'Test', type: 'policy', content: 'Content', ... },
      'user-123',
      'company-123'
    );
    
    expect(doc.version.current).toBe(1);
    expect(doc.version.history).toHaveLength(1);
  });

  it('should increment version on update', async () => {
    const doc = await documentRepository.createDocument(...);
    const updated = await documentRepository.updateDocument(
      doc.id!,
      { content: 'New content' },
      'user-123',
      'Updated',
      'company-123'
    );
    
    expect(updated.version.current).toBe(2);
    expect(updated.version.history).toHaveLength(2);
  });

  it('should rollback to previous version', async () => {
    const doc = await documentRepository.createDocument(...);
    await documentRepository.updateDocument(...); // v2
    const rolledBack = await documentRepository.rollbackToVersion(
      doc.id!,
      1,
      'user-123',
      'company-123'
    );
    
    expect(rolledBack.content).toBe(doc.content); // Original content
    expect(rolledBack.version.current).toBe(3); // New version for rollback
  });
});
```

### Integration Tests

```typescript
// test/api/documents.test.ts
describe('GET /api/documents', () => {
  it('should return paginated documents', async () => {
    const res = await fetch('/api/documents?companyId=company-123&maxItems=10');
    const data = await res.json();
    
    expect(res.status).toBe(200);
    expect(data.documents).toHaveLength(10);
    expect(data.continuationToken).toBeDefined();
  });

  it('should enforce rate limit', async () => {
    // Make 101 requests (exceeds 100/min limit)
    for (let i = 0; i < 101; i++) {
      const res = await fetch('/api/documents?companyId=company-123');
      if (i < 100) {
        expect(res.status).toBe(200);
      } else {
        expect(res.status).toBe(429); // Rate limit exceeded
      }
    }
  });
});
```

## 🚀 Deployment Checklist

### Environment Variables

```bash
# .env.production
AZURE_COSMOS_ENDPOINT=https://your-account.documents.azure.com:443/
AZURE_COSMOS_KEY=your-primary-key-here
AZURE_COSMOS_DATABASE=benefits-assistant

# Optional: Redis for distributed rate limiting
REDIS_URL=redis://your-redis-instance:6379
```

### Azure Cosmos DB Setup

1. **Create Cosmos DB Account**:
   - API: Core (SQL)
   - Consistency: Session
   - Geo-replication: East US 2 (primary) + West US 2 (secondary)
   - Autoscale: Enabled

2. **Create Database**: `benefits-assistant`

3. **Create Containers** (see `docs/AZURE_COSMOS_SCHEMA.md`):
   - `companies` (400 RU/s, partition: `/id`)
   - `users` (1000 RU/s, partition: `/companyId`)
   - `documents` (2000 RU/s, partition: `/companyId`)
   - `conversations` (5000 RU/s autoscale to 50K, partition: `/companyId`)
   - `user_surveys` (1000 RU/s, partition: `/companyId`)
   - `analytics_daily` (400 RU/s, partition: `/companyId`)
   - `audit_logs` (400 RU/s, partition: `/companyId`)

4. **Configure Security**:
   - [ ] Enable firewall (allow Vercel IP ranges)
   - [ ] Create read-only keys for frontend
   - [ ] Set up private endpoints (production)
   - [ ] Enable diagnostic logging

### Monitoring

**Azure Monitor Queries**:
```kusto
// High RU consumption
AzureDiagnostics
| where ResourceProvider == "MICROSOFT.DOCUMENTDB"
| where requestCharge_s > 100
| summarize TotalRU = sum(todouble(requestCharge_s)) by bin(TimeGenerated, 1h)

// Slow queries
AzureDiagnostics
| where durationMs_s > 1000
| project TimeGenerated, durationMs_s, activityId_g, userAgent_s
```

## 📚 Additional Resources

- [Azure Cosmos DB Best Practices](https://learn.microsoft.com/en-us/azure/cosmos-db/nosql/best-practice-dotnet)
- [Partition Key Design](https://learn.microsoft.com/en-us/azure/cosmos-db/partitioning-overview)
- [Rate Limiting Strategies](https://cloud.google.com/architecture/rate-limiting-strategies-techniques)
- [Repository Pattern](https://learn.microsoft.com/en-us/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/infrastructure-persistence-layer-design)

---

**Last Updated**: 2025-10-31  
**Maintainer**: Development Team  
**Version**: 1.0.0
