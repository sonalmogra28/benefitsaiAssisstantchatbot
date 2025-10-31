/**
 * Production Deployment Checklist
 * Complete security, performance, and operational readiness guide
 * 
 * CRITICAL: Complete all items before deploying to production
 */

# Production Deployment Checklist

## ✅ Security Configuration

### Environment Variables (CRITICAL - DO FIRST)
- [ ] Set `AZURE_COSMOS_ENDPOINT` - Your Cosmos DB account endpoint
- [ ] Set `AZURE_COSMOS_KEY` - Primary or secondary key (use Azure Key Vault in production)
- [ ] Set `AZURE_COSMOS_DATABASE` - Database name (default: benefits-assistant)
- [ ] Set `AZURE_OPENAI_ENDPOINT` - OpenAI endpoint URL
- [ ] Set `AZURE_OPENAI_API_KEY` - API key for Azure OpenAI
- [ ] Set `AZURE_SEARCH_ENDPOINT` - AI Search service endpoint
- [ ] Set `AZURE_SEARCH_ADMIN_KEY` - Admin key for indexing
- [ ] Set `NEXTAUTH_SECRET` - Generate: `openssl rand -base64 32`
- [ ] Set `ENCRYPTION_KEY` - 32-character encryption key
- [ ] Set `SHARED_PASSWORD` - Strong shared password for admin access
- [ ] Set `REDIS_URL` - Redis connection string for caching
- [ ] Set `RATE_LIMIT_REDIS_URL` - Redis for rate limiting (can be same as above)

### Azure Cosmos DB Security
- [ ] Enable private endpoints for VNet isolation
- [ ] Configure IP firewall rules (whitelist application IPs only)
- [ ] Enable automatic failover for high availability
- [ ] Set up RBAC roles (avoid using primary keys in application)
- [ ] Enable audit logging and diagnostics
- [ ] Configure backup policy (automatic backups enabled by default)
- [ ] Enable encryption at rest (enabled by default)
- [ ] Use Azure Managed Identity instead of connection strings (recommended)

### Application Security
- [ ] Enable HTTPS only (disable HTTP)
- [ ] Configure CORS policies (restrict allowed origins)
- [ ] Implement rate limiting on all API routes
- [ ] Enable CSRF protection for mutations
- [ ] Set secure HTTP headers (CSP, HSTS, X-Frame-Options)
- [ ] Sanitize all user inputs
- [ ] Validate file uploads (size, type, content)
- [ ] Implement request signing for webhooks
- [ ] Enable audit logging for all sensitive operations

## ✅ Database Setup

### Cosmos DB Containers (Create in Order)
1. **Companies Container**
   ```bash
   az cosmosdb sql container create \
     --account-name YOUR_ACCOUNT \
     --database-name benefits-assistant \
     --name companies \
     --partition-key-path "/id" \
     --throughput 400
   ```

2. **Users Container**
   ```bash
   az cosmosdb sql container create \
     --account-name YOUR_ACCOUNT \
     --database-name benefits-assistant \
     --name users \
     --partition-key-path "/companyId" \
     --throughput 1000
   ```

3. **Documents Container**
   ```bash
   az cosmosdb sql container create \
     --account-name YOUR_ACCOUNT \
     --database-name benefits-assistant \
     --name documents \
     --partition-key-path "/companyId" \
     --throughput 2000
   ```

4. **Conversations Container** (High Volume)
   ```bash
   az cosmosdb sql container create \
     --account-name YOUR_ACCOUNT \
     --database-name benefits-assistant \
     --name conversations \
     --partition-key-path "/companyId" \
     --throughput 5000 \
     --max-throughput 50000 \
     --default-ttl 31536000
   ```

5. **User Surveys Container**
   ```bash
   az cosmosdb sql container create \
     --account-name YOUR_ACCOUNT \
     --database-name benefits-assistant \
     --name user_surveys \
     --partition-key-path "/companyId" \
     --throughput 1000
   ```

6. **Analytics Daily Container**
   ```bash
   az cosmosdb sql container create \
     --account-name YOUR_ACCOUNT \
     --database-name benefits-assistant \
     --name analytics_daily \
     --partition-key-path "/companyId" \
     --throughput 400 \
     --analytical-storage-ttl -1
   ```

7. **Audit Logs Container**
   ```bash
   az cosmosdb sql container create \
     --account-name YOUR_ACCOUNT \
     --database-name benefits-assistant \
     --name audit_logs \
     --partition-key-path "/companyId" \
     --throughput 400 \
     --default-ttl 220752000
   ```

### Indexing Policies
- [ ] Configure composite indexes for common queries
- [ ] Exclude large fields (embeddings, content) from indexing
- [ ] Set up vector indexing for AI Search integration

## ✅ Performance Optimization

### Cosmos DB Performance
- [ ] Enable autoscale for variable workloads
- [ ] Configure multi-region writes for global apps
- [ ] Set up dedicated gateway for VNet scenarios
- [ ] Enable query metrics for performance monitoring
- [ ] Optimize partition key selection (companyId for multi-tenancy)
- [ ] Use bulk operations for batch writes
- [ ] Implement connection pooling (built into client)

### Application Performance
- [ ] Enable Redis caching for frequently accessed data
- [ ] Implement CDN for static assets
- [ ] Use Next.js static generation where possible
- [ ] Enable gzip compression
- [ ] Optimize images (next/image)
- [ ] Lazy load components and routes
- [ ] Implement pagination for large datasets
- [ ] Use React.memo for expensive components

## ✅ Monitoring & Observability

### Azure Monitoring
- [ ] Enable Application Insights
- [ ] Set up Cosmos DB metrics dashboards
- [ ] Configure availability tests
- [ ] Set up alert rules:
  - High RU consumption (>80% of provisioned)
  - Throttling errors (429 status codes)
  - High latency (>100ms p95)
  - Failed requests (>1% error rate)
  - Cosmos DB availability <99.9%
- [ ] Enable distributed tracing
- [ ] Set up log analytics workspace

### Application Monitoring
- [ ] Implement structured logging (use lib/logger.ts)
- [ ] Track custom metrics (conversation quality, satisfaction scores)
- [ ] Monitor API response times
- [ ] Track error rates by endpoint
- [ ] Monitor cache hit ratios
- [ ] Set up dashboards for business metrics

## ✅ Disaster Recovery

### Backup Strategy
- [ ] Verify automatic backup configuration (8-hour interval)
- [ ] Test backup restoration procedure
- [ ] Document recovery time objective (RTO)
- [ ] Document recovery point objective (RPO)
- [ ] Set up point-in-time restore testing
- [ ] Configure geo-redundant backups

### High Availability
- [ ] Enable multi-region deployment (East US 2 + West US 2)
- [ ] Configure automatic failover
- [ ] Test failover procedures
- [ ] Document disaster recovery runbook
- [ ] Set up health checks and monitoring

## ✅ Cost Optimization

### Cosmos DB Cost Management
- [ ] Right-size throughput (start conservative, scale up)
- [ ] Use autoscale for variable workloads (40-60% savings)
- [ ] Enable analytical storage for cold data
- [ ] Set TTL policies to auto-delete old data
- [ ] Monitor and optimize query patterns
- [ ] Use reserved capacity for predictable workloads (up to 65% savings)

### Estimated Monthly Costs
- **Cosmos DB**: ~$600/month (10,200 RU/s base)
  - Companies: 400 RU/s = $24
  - Users: 1000 RU/s = $60
  - Documents: 2000 RU/s = $120
  - Conversations: 5000 RU/s autoscale = $300
  - Surveys: 1000 RU/s = $60
  - Analytics: 400 RU/s = $24
  - Audit Logs: 400 RU/s = $24
- **Azure OpenAI**: Variable (depends on usage)
- **Azure AI Search**: $250-500/month (standard tier)
- **Redis Cache**: $15-75/month (basic tier)
- **Total**: ~$865-1,175/month (before autoscale savings)

## ✅ Testing

### Pre-Production Testing
- [ ] Run full test suite: `npm test`
- [ ] Run type checking: `npm run typecheck`
- [ ] Run linter: `npm run lint`
- [ ] Test API endpoints with Postman/Insomnia
- [ ] Load test with k6 or Artillery (target: 100 concurrent users)
- [ ] Test failover scenarios
- [ ] Validate security headers with SecurityHeaders.com
- [ ] Test authentication flows
- [ ] Verify RBAC permissions

### Quality Assurance
- [ ] Test document upload and versioning
- [ ] Verify conversation quality tracking
- [ ] Test analytics dashboards
- [ ] Validate satisfaction surveys
- [ ] Test CMS content editor
- [ ] Verify multi-tenant isolation
- [ ] Test rate limiting
- [ ] Validate error handling

## ✅ Documentation

### Technical Documentation
- [ ] API documentation (Swagger/OpenAPI)
- [ ] Database schema documentation (docs/AZURE_COSMOS_SCHEMA.md) ✅
- [ ] Architecture diagrams
- [ ] Deployment runbook
- [ ] Troubleshooting guide
- [ ] Performance tuning guide

### User Documentation
- [ ] Admin user guide
- [ ] Company admin guide
- [ ] End-user guide
- [ ] FAQ document
- [ ] Training materials

## ✅ Compliance & Legal

### Data Protection
- [ ] GDPR compliance review
- [ ] HIPAA compliance (if handling health data)
- [ ] Data retention policies implemented
- [ ] User data export functionality
- [ ] Right to deletion implementation
- [ ] Privacy policy updated
- [ ] Terms of service updated

### Security Compliance
- [ ] SOC 2 requirements checklist
- [ ] PCI DSS (if processing payments)
- [ ] Security audit completed
- [ ] Penetration testing conducted
- [ ] Vulnerability scanning enabled

## ✅ Deployment

### Pre-Deployment
- [ ] Create production environment in Vercel/Azure
- [ ] Set all environment variables
- [ ] Configure custom domain (bcgenrolls.com)
- [ ] Set up SSL certificates
- [ ] Configure DNS records
- [ ] Test staging environment

### Deployment Steps
1. [ ] Tag release: `git tag -a v1.0.0 -m "Production release"`
2. [ ] Build production: `npm run build`
3. [ ] Deploy to production
4. [ ] Smoke test critical paths
5. [ ] Monitor error logs for 24 hours
6. [ ] Verify analytics collection

### Post-Deployment
- [ ] Update status page
- [ ] Notify stakeholders
- [ ] Monitor dashboards for 48 hours
- [ ] Document any issues encountered
- [ ] Schedule post-mortem meeting

## ✅ Ongoing Maintenance

### Daily Tasks
- [ ] Review error logs
- [ ] Check system health dashboards
- [ ] Monitor cost consumption

### Weekly Tasks
- [ ] Review performance metrics
- [ ] Analyze user feedback
- [ ] Update documentation
- [ ] Security patch review

### Monthly Tasks
- [ ] Cost optimization review
- [ ] Capacity planning
- [ ] Security audit
- [ ] Backup verification test
- [ ] Performance optimization review

---

## Quick Start Commands

### Development
```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your Azure credentials

# Run development server
npm run dev

# Type checking
npm run typecheck

# Build for production
npm run build
```

### Azure CLI Setup
```bash
# Login to Azure
az login

# Create Cosmos DB account
az cosmosdb create \
  --name benefits-assistant-prod \
  --resource-group benefits-ai-rg \
  --locations regionName=eastus2 failoverPriority=0 \
  --default-consistency-level Session \
  --enable-automatic-failover true

# Create database
az cosmosdb sql database create \
  --account-name benefits-assistant-prod \
  --name benefits-assistant \
  --throughput 400
```

---

## Support & Escalation

### Production Issues
- **P0 (Critical)**: System down - Page on-call engineer
- **P1 (High)**: Major functionality impaired - Alert within 1 hour
- **P2 (Medium)**: Minor functionality impaired - Alert within 4 hours
- **P3 (Low)**: Enhancement request - Standard backlog

### Emergency Contacts
- DevOps Lead: [Contact Info]
- Database Admin: [Contact Info]
- Security Team: [Contact Info]
- Azure Support: 1-800-MICROSOFT

---

**Last Updated**: 2025-10-31
**Document Version**: 1.0.0
**Next Review Date**: 2025-11-30
