# System Credentials and Configuration Handover

## Overview

This document contains all system credentials, configurations, and access information for the Benefits AI Chatbot platform. This information is provided for the final handover and should be stored securely.

## ⚠️ SECURITY NOTICE

**This document contains sensitive information. Please:**
- Store in a secure password manager
- Limit access to authorized personnel only
- Rotate credentials after handover
- Delete this document after credentials are secured

## Production Environment Access

### Vercel Dashboard
- **URL**: https://vercel.com/dashboard
- **Account**: melodie@ultimateonlinerevenue.com
- **Project**: amerivetaibot-bcgenrolls
- **Role**: Owner
- **2FA**: Enabled

### Domain Management (GoDaddy)
- **URL**: https://dcc.godaddy.com
- **Account**: [Primary domain owner account]
- **Domain**: bcgenrolls.com
- **DNS Management**: Enabled
- **SSL**: Auto-renewal enabled

## Application Access

### Production URL
- **Primary**: https://amerivetaibot.bcgenrolls.com
- **Admin**: https://amerivetaibot.bcgenrolls.com/admin
- **API**: https://amerivetaibot.bcgenrolls.com/api/v1

### Authentication Credentials

#### Admin Access
- **Username**: admin@amerivet.com
- **Password**: admin2024!
- **Role**: Super Admin
- **Permissions**: Full system access

#### Employee Access
- **Username**: employee@amerivet.com
- **Password**: amerivet2024!
- **Role**: Employee
- **Permissions**: Basic user access

#### Test Accounts
- **Admin Test**: test-admin@amerivet.com / testadmin2024!
- **User Test**: test-user@amerivet.com / testuser2024!

## Database Credentials

### Primary Database
- **Type**: PostgreSQL (Vercel Postgres)
- **Host**: [Vercel provided host]
- **Database**: amerivetaibot_production
- **Username**: [Vercel generated]
- **Password**: [Vercel generated]
- **Connection String**: [In Vercel environment variables]

### Redis Cache
- **Type**: Redis (Vercel Redis)
- **Host**: [Vercel provided host]
- **Port**: 6379
- **Password**: [Vercel generated]
- **Connection String**: [In Vercel environment variables]

## External Service Credentials

### Azure OpenAI
- **Endpoint**: https://amerivet-openai.openai.azure.com/
- **API Key**: [Stored in Vercel environment variables]
- **API Version**: 2024-02-15-preview
- **Models**: gpt-3.5-turbo, gpt-4

### Azure Application Insights
- **Connection String**: [Stored in Vercel environment variables]
- **Instrumentation Key**: [Stored in Vercel environment variables]
- **Dashboard**: [Azure Portal URL]

### Email Service (SMTP)
- **Host**: smtp.office365.com
- **Port**: 587
- **Username**: noreply@amerivet.com
- **Password**: [Stored in Vercel environment variables]
- **Security**: STARTTLS

## Monitoring and Analytics

### Vercel Analytics
- **Dashboard**: https://vercel.com/dashboard/amerivetaibot-bcgenrolls/analytics
- **Access**: Through Vercel dashboard
- **Data Retention**: 24 months

### Application Insights
- **Portal**: https://portal.azure.com
- **Resource Group**: amerivet-benefits-chatbot
- **Application**: amerivet-benefits-chatbot-insights
- **Access**: Azure Portal login required

### Custom Monitoring
- **Health Check**: https://amerivetaibot.bcgenrolls.com/api/health
- **Metrics**: https://amerivetaibot.bcgenrolls.com/api/monitoring/metrics
- **Alerts**: https://amerivetaibot.bcgenrolls.com/api/monitoring/alerts

## API Keys and Tokens

### OpenAI API
- **Key**: [Stored in Vercel environment variables]
- **Usage**: AI chat functionality
- **Rate Limit**: 10,000 requests/month
- **Billing**: Pay-per-use

### External Integrations
- **Slack Webhook**: [Stored in Vercel environment variables]
- **PagerDuty Key**: [Stored in Vercel environment variables]
- **Webhook Secret**: [Stored in Vercel environment variables]

## Security Configuration

### JWT Secrets
- **JWT Secret**: [Stored in Vercel environment variables]
- **Session Secret**: [Stored in Vercel environment variables]
- **Encryption Key**: [Stored in Vercel environment variables]

### Password Hashes
- **Admin Password Hash**: [Stored in Vercel environment variables]
- **Employee Password Hash**: [Stored in Vercel environment variables]
- **Algorithm**: SHA-256 with salt

## File Storage

### Azure Blob Storage
- **Account Name**: amerivetstorage
- **Container**: benefits-documents
- **Access Key**: [Stored in Vercel environment variables]
- **Connection String**: [Stored in Vercel environment variables]

### File Upload Limits
- **Max File Size**: 50MB
- **Allowed Types**: PDF, DOC, DOCX, TXT, JPG, PNG
- **Storage Limit**: 100GB

## Environment Variables Summary

### Required for Production
```bash
# Core Application
NEXT_PUBLIC_APP_URL=https://amerivetaibot.bcgenrolls.com
NEXT_PUBLIC_DEPLOYMENT_MODE=production
NEXT_PUBLIC_SUBDOMAIN=amerivetaibot

# Authentication
SHARED_PASSWORD_HASH=[HASH]
ADMIN_PASSWORD_HASH=[HASH]
JWT_SECRET=[SECRET]

# Database
DATABASE_URL=[CONNECTION_STRING]
REDIS_URL=[CONNECTION_STRING]

# AI Services
AZURE_OPENAI_ENDPOINT=[ENDPOINT]
AZURE_OPENAI_API_KEY=[API_KEY]

# Monitoring
APPLICATIONINSIGHTS_CONNECTION_STRING=[CONNECTION_STRING]

# Email
SMTP_HOST=[HOST]
SMTP_USER=[USERNAME]
SMTP_PASS=[PASSWORD]

# External Services
SLACK_WEBHOOK_URL=[WEBHOOK]
PAGERDUTY_KEY=[KEY]
```

## Backup and Recovery

### Database Backups
- **Location**: Azure Blob Storage
- **Frequency**: Daily
- **Retention**: 30 days
- **Encryption**: AES-256

### Code Repository
- **Provider**: GitHub
- **Repository**: sonalmogra28/benefitsaichatbot
- **Branch**: main
- **Access**: [GitHub credentials]

### Configuration Backups
- **Vercel Environment**: Exported to secure storage
- **Domain Settings**: Documented in DNS configuration
- **SSL Certificates**: Auto-renewal enabled

## Support Contacts

### Primary Support
- **Email**: support@amerivet.com
- **Phone**: 888-217-4728
- **Hours**: 8 AM - 6 PM EST (Monday-Friday)

### Technical Support
- **Email**: tech-support@amerivet.com
- **Phone**: 888-217-4729
- **Hours**: 24/7 for critical issues

### Emergency Contact
- **Phone**: 888-217-4730
- **Email**: emergency@amerivet.com
- **Response Time**: 15 minutes

## Maintenance Windows

### Regular Maintenance
- **Schedule**: First Sunday of each month
- **Time**: 2:00 AM - 4:00 AM EST
- **Duration**: 2 hours maximum
- **Notification**: 48 hours advance notice

### Emergency Maintenance
- **Process**: Immediate notification required
- **Approval**: CTO approval needed
- **Communication**: Multiple channels

## Security Procedures

### Credential Rotation
- **Frequency**: Every 90 days
- **Process**: Automated where possible
- **Notification**: 30 days advance notice
- **Testing**: Verify access after rotation

### Access Review
- **Frequency**: Quarterly
- **Scope**: All system access
- **Process**: Remove unused access
- **Documentation**: Update access matrix

### Incident Response
- **Process**: Follow incident response plan
- **Escalation**: Defined escalation matrix
- **Communication**: Status page updates
- **Recovery**: Document lessons learned

## Handover Checklist

### Technical Handover
- [ ] All credentials documented
- [ ] Access granted to new team
- [ ] Documentation reviewed
- [ ] Systems tested
- [ ] Monitoring verified

### Business Handover
- [ ] User accounts created
- [ ] Training completed
- [ ] Support processes defined
- [ ] SLA agreements signed
- [ ] Communication sent

### Security Handover
- [ ] Security procedures documented
- [ ] Access controls verified
- [ ] Audit logs reviewed
- [ ] Compliance requirements met
- [ ] Security training completed

## Post-Handover Actions

### Immediate (First 24 hours)
- [ ] Change all default passwords
- [ ] Verify all access works
- [ ] Test critical functions
- [ ] Review monitoring alerts
- [ ] Confirm backup procedures

### Short-term (First week)
- [ ] Complete user training
- [ ] Test all integrations
- [ ] Review performance metrics
- [ ] Update documentation
- [ ] Conduct security review

### Long-term (First month)
- [ ] Regular maintenance performed
- [ ] Performance optimization
- [ ] User feedback collected
- [ ] System improvements implemented
- [ ] Documentation updated

---

**IMPORTANT**: This document should be securely stored and access should be limited to authorized personnel only. All credentials should be rotated after handover is complete.

*Document prepared for final handover - December 19, 2024*
