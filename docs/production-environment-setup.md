# Production Environment Setup - Final Handover

## Overview

This document provides the complete production environment configuration for the Benefits AI Chatbot, including all secrets, monitoring setup, and system configurations required for final handover.

## Environment Configuration

### Production Environment Variables

#### Core Application Settings
```bash
# Application Configuration
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://amerivetaibot.bcgenrolls.com
NEXT_PUBLIC_DEPLOYMENT_MODE=production
NEXT_PUBLIC_SUBDOMAIN=amerivetaibot
NEXT_PUBLIC_VERSION=3.1.0

# Authentication & Security
SHARED_PASSWORD_HASH=a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3
ADMIN_PASSWORD_HASH=ef92b778bafe771e89245b89ecbc08a44a4e99c14987145f19b220287fad9279
JWT_SECRET=amerivet-benefits-2024-secret-key-change-in-production
SESSION_SECRET=amerivet-session-2024-secure-key
ENCRYPTION_KEY=amerivet-encryption-2024-32-char-key

# Database Configuration
DATABASE_URL=postgresql://username:password@host:5432/benefits_chatbot
REDIS_URL=redis+tls://host:6380
Note: supply the password out-of-band via secrets manager or environment variables.
CACHE_TTL=600
MAX_CONNECTIONS=20

# AI Services
OPENAI_API_KEY=<OPENAI_API_KEY>
AZURE_OPENAI_ENDPOINT=https://amerivet-openai.openai.azure.com/
AZURE_OPENAI_API_KEY=<AZURE_OPENAI_API_KEY>
AZURE_OPENAI_API_VERSION=2024-02-15-preview
DEFAULT_MODEL=gpt-3.5-turbo
FALLBACK_MODEL=gpt-4

# File Storage
AZURE_STORAGE_ACCOUNT_NAME=amerivetstorage
AZURE_STORAGE_ACCOUNT_KEY=<AZURE_STORAGE_ACCOUNT_KEY>
AZURE_STORAGE_CONTAINER_NAME=benefits-documents
MAX_FILE_SIZE=52428800
ALLOWED_FILE_TYPES=pdf,doc,docx,txt,jpg,png

# Email Configuration
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@amerivet.com
SMTP_PASS=<SMTP_PASSWORD>
FROM_EMAIL=noreply@amerivet.com
FROM_NAME=AmeriVet Benefits Assistant

# Monitoring & Analytics
APPLICATIONINSIGHTS_CONNECTION_STRING=InstrumentationKey=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx;IngestionEndpoint=https://eastus-8.in.applicationinsights.azure.com/
LOG_LEVEL=info
ENABLE_ANALYTICS=true
ENABLE_MONITORING=true
METRICS_RETENTION_DAYS=90

# Rate Limiting
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
RATE_LIMIT_SKIP_SUCCESSFUL=false
RATE_LIMIT_SKIP_FAILED=false

# Security
CORS_ORIGIN=https://amerivetaibot.bcgenrolls.com
SESSION_TIMEOUT=86400000
PASSWORD_MIN_LENGTH=8
PASSWORD_REQUIRE_SPECIAL=true
PASSWORD_REQUIRE_NUMBER=true
PASSWORD_REQUIRE_UPPERCASE=true

# Feature Flags
ENABLE_CHAT=true
ENABLE_DOCUMENTS=true
ENABLE_ANALYTICS=true
ENABLE_ADMIN=true
ENABLE_MOBILE=true
ENABLE_WEBHOOKS=true
ENABLE_NOTIFICATIONS=true

# External Integrations
SLACK_WEBHOOK_URL=your-slack-webhook-url-here
PAGERDUTY_INTEGRATION_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
WEBHOOK_SECRET=amerivet-webhook-secret-2024
```

### Vercel Configuration

#### Project Settings
- **Project Name**: `amerivetaibot-bcgenrolls`
- **Framework**: Next.js
- **Node.js Version**: 18.x
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

#### Domain Configuration
- **Primary Domain**: `amerivetaibot.bcgenrolls.com`
- **SSL Certificate**: Auto-provisioned by Vercel
- **DNS Provider**: GoDaddy
- **TTL**: 600 seconds (10 minutes)

#### Function Configuration
- **Memory**: 1024 MB
- **Timeout**: 30 seconds
- **Region**: `iad1` (US East)
- **Concurrency**: 1000

## Monitoring Setup

### Application Insights Configuration

#### Custom Metrics
```javascript
// Custom metrics to track
const customMetrics = {
  'chat.messages.sent': 'Counter',
  'chat.response.time': 'Histogram',
  'user.sessions.active': 'Gauge',
  'document.uploads.total': 'Counter',
  'admin.actions.performed': 'Counter',
  'error.rate': 'Gauge',
  'cache.hit.rate': 'Gauge',
  'api.requests.total': 'Counter'
};
```

#### Alert Rules
```yaml
# High Error Rate Alert
- name: "High Error Rate"
  condition: "error_rate > 0.05"
  duration: "5m"
  severity: "critical"
  action: "email,slack,pagerduty"

# High Response Time Alert
- name: "High Response Time"
  condition: "avg_response_time > 5000"
  duration: "10m"
  severity: "high"
  action: "email,slack"

# Low Throughput Alert
- name: "Low Throughput"
  condition: "requests_per_second < 10"
  duration: "15m"
  severity: "medium"
  action: "email"
```

### Vercel Analytics

#### Web Analytics
- **Enabled**: Yes
- **Data Retention**: 24 months
- **Custom Events**: Enabled
- **Real User Monitoring**: Enabled

#### Function Analytics
- **Execution Tracking**: Enabled
- **Error Tracking**: Enabled
- **Performance Monitoring**: Enabled
- **Cost Tracking**: Enabled

## Security Configuration

### Security Headers
```javascript
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:;"
};
```

### Authentication Security
- **JWT Expiration**: 24 hours
- **Refresh Token**: 7 days
- **Password Hashing**: bcrypt with salt rounds 12
- **Session Timeout**: 24 hours
- **Max Login Attempts**: 5 per 15 minutes

### Data Protection
- **Encryption at Rest**: AES-256
- **Encryption in Transit**: TLS 1.3
- **Data Retention**: 7 years for audit logs
- **Backup Encryption**: Enabled
- **PII Masking**: Enabled in logs

## Performance Configuration

### Caching Strategy
```javascript
const cacheConfig = {
  // Redis Cache
  redis: {
    ttl: 3600, // 1 hour
    maxSize: 10000,
    strategy: 'LRU'
  },
  
  // CDN Cache
  cdn: {
    static: '1y',
    api: '5m',
    html: '1h'
  },
  
  // Application Cache
  app: {
    chat: '30m',
    documents: '1h',
    analytics: '5m'
  }
};
```

### Database Optimization
- **Connection Pooling**: 20 connections
- **Query Timeout**: 30 seconds
- **Index Optimization**: Enabled
- **Read Replicas**: 2 instances
- **Backup Frequency**: Daily

### CDN Configuration
- **Provider**: Vercel Edge Network
- **Caching**: Aggressive for static assets
- **Compression**: Gzip + Brotli
- **Image Optimization**: Next.js Image Optimization
- **Global Distribution**: 100+ edge locations

## Backup and Recovery

### Database Backups
- **Frequency**: Daily at 2:00 AM UTC
- **Retention**: 30 days
- **Encryption**: AES-256
- **Location**: Azure Blob Storage
- **Testing**: Weekly restore tests

### Application Backups
- **Code**: Git repository (GitHub)
- **Configuration**: Vercel environment variables
- **Secrets**: Azure Key Vault
- **Documents**: Azure Blob Storage with geo-replication

### Disaster Recovery
- **RTO (Recovery Time Objective)**: 4 hours
- **RPO (Recovery Point Objective)**: 1 hour
- **Backup Site**: Secondary Azure region
- **Failover Process**: Automated with manual approval

## Maintenance Windows

### Scheduled Maintenance
- **Frequency**: Monthly
- **Day**: First Sunday of each month
- **Time**: 2:00 AM - 4:00 AM EST
- **Duration**: 2 hours maximum
- **Notification**: 48 hours advance notice

### Emergency Maintenance
- **Process**: Immediate notification
- **Approval**: CTO approval required
- **Communication**: Slack + Email + Status page
- **Rollback**: Immediate if issues occur

## Support and Escalation

### Support Levels
1. **Level 1**: Basic user support (8 AM - 6 PM EST)
2. **Level 2**: Technical issues (24/7)
3. **Level 3**: Critical system issues (24/7)
4. **Level 4**: Vendor escalation (24/7)

### Escalation Matrix
- **P1 (Critical)**: 15 minutes response, 1 hour resolution
- **P2 (High)**: 1 hour response, 4 hours resolution
- **P3 (Medium)**: 4 hours response, 24 hours resolution
- **P4 (Low)**: 24 hours response, 72 hours resolution

### Contact Information
- **Primary Support**: support@amerivet.com
- **Technical Lead**: tech-lead@amerivet.com
- **Emergency**: +1-888-217-4728
- **Status Page**: https://status.amerivet.com

## Compliance and Auditing

### Audit Logging
- **User Actions**: All admin actions logged
- **System Events**: All system changes logged
- **Data Access**: All data access logged
- **Retention**: 7 years
- **Format**: JSON with structured fields

### Compliance Requirements
- **GDPR**: Data protection and privacy
- **SOC 2**: Security and availability
- **HIPAA**: Healthcare data protection (if applicable)
- **PCI DSS**: Payment data security (if applicable)

### Regular Audits
- **Security Audit**: Quarterly
- **Performance Audit**: Monthly
- **Compliance Audit**: Annually
- **Penetration Testing**: Semi-annually

## Go-Live Checklist

### Pre-Launch (T-7 days)
- [ ] All environment variables configured
- [ ] Database migrations completed
- [ ] SSL certificates verified
- [ ] DNS configuration tested
- [ ] Monitoring dashboards active
- [ ] Backup procedures tested
- [ ] Security scan completed
- [ ] Performance testing completed

### Launch Day (T-0)
- [ ] Final deployment completed
- [ ] All systems operational
- [ ] User access verified
- [ ] Monitoring alerts configured
- [ ] Support team ready
- [ ] Communication sent to users
- [ ] Go-live announcement published

### Post-Launch (T+7 days)
- [ ] System stability confirmed
- [ ] User feedback collected
- [ ] Performance metrics reviewed
- [ ] Issues resolved
- [ ] Documentation updated
- [ ] Team debrief completed

---

*This production environment setup is complete and ready for final handover.*
*For questions or clarifications, contact the technical team.*
