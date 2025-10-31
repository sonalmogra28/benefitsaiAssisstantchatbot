# Vercel Production Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the Benefits AI Chatbot to Vercel with custom domain configuration and production-ready settings.

## Prerequisites

- Vercel account with Pro plan or higher
- Domain access (GoDaddy or other DNS provider)
- Environment variables configured
- GitHub repository connected

## Deployment Steps

### Step 1: Vercel Project Setup

1. **Login to Vercel Dashboard**
   - Go to [vercel.com](https://vercel.com)
   - Login with your account

2. **Import Project**
   - Click "New Project"
   - Import from GitHub repository
   - Select `benefitsaichatbot-383` repository
   - Choose "Root Directory" as project root

3. **Configure Build Settings**
   - **Framework Preset**: Next.js
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`

### Step 2: Environment Variables

Configure the following environment variables in Vercel:

#### Required Variables
```bash
# Application
NEXT_PUBLIC_APP_URL=https://amerivetaibot.bcgenrolls.com
NEXT_PUBLIC_DEPLOYMENT_MODE=production
NEXT_PUBLIC_SUBDOMAIN=amerivetaibot

# Authentication
SHARED_PASSWORD_HASH=a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3
ADMIN_PASSWORD_HASH=ef92b778bafe771e89245b89ecbc08a44a4e99c14987145f19b220287fad9279
JWT_SECRET=amerivet-benefits-2024-secret-key-change-in-production

# Database (if using external DB)
DATABASE_URL=your-database-connection-string

# Redis (if using external Redis)
REDIS_URL=your-redis-connection-string

# Monitoring
APPLICATIONINSIGHTS_CONNECTION_STRING=your-app-insights-connection-string

# External Services
OPENAI_API_KEY=your-openai-api-key
AZURE_OPENAI_ENDPOINT=your-azure-openai-endpoint
AZURE_OPENAI_API_KEY=your-azure-openai-key

# Email (if using email notifications)
SMTP_HOST=your-smtp-host
SMTP_PORT=587
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password

# Webhooks (if using webhooks)
SLACK_WEBHOOK_URL=your-slack-webhook-url
PAGERDUTY_KEY=your-pagerduty-integration-key
```

#### Optional Variables
```bash
# Feature Flags
ENABLE_ANALYTICS=true
ENABLE_MONITORING=true
ENABLE_RATE_LIMITING=true
ENABLE_CACHING=true

# Performance
CACHE_TTL=600
MAX_FILE_SIZE=52428800
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100

# Security
CORS_ORIGIN=https://amerivetaibot.bcgenrolls.com
SESSION_TIMEOUT=86400000
```

### Step 3: Domain Configuration

#### DNS Setup (GoDaddy)

1. **Login to GoDaddy DNS Management**
   - Go to your domain management
   - Navigate to DNS settings

2. **Add CNAME Record**
   ```
   Type: CNAME
   Name: amerivetaibot
   Value: cname.vercel-dns.com
   TTL: 600 (10 minutes)
   ```

3. **Verify DNS Propagation**
   ```bash
   nslookup amerivetaibot.bcgenrolls.com
   dig amerivetaibot.bcgenrolls.com
   ```

#### Vercel Domain Configuration

1. **Add Custom Domain**
   - Go to Project Settings → Domains
   - Add `amerivetaibot.bcgenrolls.com`
   - Wait for DNS verification

2. **Configure SSL**
   - Vercel automatically provisions SSL certificates
   - Verify HTTPS is working

### Step 4: Production Configuration

#### Performance Optimization

1. **Enable Edge Functions**
   - Go to Functions tab
   - Enable Edge Runtime for API routes
   - Configure memory and timeout settings

2. **Configure Caching**
   - Set up CDN caching
   - Configure static asset caching
   - Enable compression

3. **Database Optimization**
   - Configure connection pooling
   - Set up read replicas if needed
   - Enable query caching

#### Security Configuration

1. **Security Headers**
   - Verify security headers are applied
   - Test CSP (Content Security Policy)
   - Validate CORS settings

2. **Rate Limiting**
   - Configure rate limits per endpoint
   - Set up IP-based limiting
   - Monitor rate limit usage

3. **Authentication**
   - Test login flows
   - Verify session management
   - Check password policies

### Step 5: Monitoring Setup

#### Vercel Analytics

1. **Enable Vercel Analytics**
   - Go to Analytics tab
   - Enable Web Analytics
   - Configure custom events

2. **Set Up Alerts**
   - Configure error rate alerts
   - Set up performance alerts
   - Enable uptime monitoring

#### External Monitoring

1. **Application Insights**
   - Configure Azure Application Insights
   - Set up custom metrics
   - Create dashboards

2. **Uptime Monitoring**
   - Set up external uptime monitoring
   - Configure alert notifications
   - Test alert delivery

### Step 6: Testing and Validation

#### Pre-deployment Testing

1. **Build Test**
   ```bash
   npm run build
   npm run start
   ```

2. **Function Testing**
   - Test all API endpoints
   - Verify authentication
   - Check error handling

3. **Performance Testing**
   - Run load tests
   - Check response times
   - Validate caching

#### Post-deployment Testing

1. **Smoke Tests**
   - Test login functionality
   - Verify chat interface
   - Check admin dashboard

2. **Integration Tests**
   - Test external integrations
   - Verify webhook delivery
   - Check email notifications

3. **User Acceptance Testing**
   - Test with real users
   - Gather feedback
   - Fix critical issues

### Step 7: Go-Live Checklist

#### Technical Checklist
- [ ] Domain configured and verified
- [ ] SSL certificate active
- [ ] Environment variables set
- [ ] Database connected
- [ ] External services configured
- [ ] Monitoring active
- [ ] Backup configured
- [ ] Security headers applied
- [ ] Rate limiting enabled
- [ ] Caching configured

#### Functional Checklist
- [ ] User login works
- [ ] Chat interface functional
- [ ] Admin dashboard accessible
- [ ] Document upload works
- [ ] Analytics displaying
- [ ] Alerts configured
- [ ] Email notifications working
- [ ] Mobile responsive
- [ ] Performance acceptable
- [ ] Error handling working

#### Business Checklist
- [ ] User training completed
- [ ] Documentation available
- [ ] Support processes in place
- [ ] Monitoring dashboards ready
- [ ] Backup procedures tested
- [ ] Rollback plan prepared
- [ ] Communication sent to users
- [ ] Go-live announcement ready

## Post-Deployment

### Monitoring

1. **Check Vercel Dashboard**
   - Monitor function executions
   - Check error rates
   - Review performance metrics

2. **Application Monitoring**
   - Review Application Insights
   - Check custom metrics
   - Monitor alert status

3. **User Feedback**
   - Monitor user feedback
   - Track support tickets
   - Review usage analytics

### Maintenance

1. **Regular Updates**
   - Monitor for security updates
   - Update dependencies
   - Apply patches

2. **Performance Optimization**
   - Monitor performance metrics
   - Optimize slow queries
   - Update caching strategies

3. **Backup and Recovery**
   - Verify backup procedures
   - Test recovery processes
   - Update disaster recovery plans

## Troubleshooting

### Common Issues

#### Build Failures
- Check environment variables
- Verify build logs
- Test locally first

#### Domain Issues
- Verify DNS configuration
- Check SSL certificate
- Test from different locations

#### Performance Issues
- Check function timeouts
- Review database queries
- Optimize caching

#### Authentication Issues
- Verify JWT configuration
- Check session settings
- Test with different browsers

### Support Resources

- **Vercel Documentation**: [vercel.com/docs](https://vercel.com/docs)
- **Next.js Documentation**: [nextjs.org/docs](https://nextjs.org/docs)
- **Project Documentation**: [docs/](./docs/)
- **Support Email**: support@company.com

## Rollback Plan

### Quick Rollback
1. Revert to previous deployment
2. Check system health
3. Notify users if needed

### Full Rollback
1. Restore database backup
2. Revert code changes
3. Update DNS if needed
4. Verify all systems

---

*Last updated: December 19, 2024*
*For deployment support, contact devops@company.com*
