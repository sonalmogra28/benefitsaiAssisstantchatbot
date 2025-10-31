# 🚀 Vercel Deployment Guide for amerivetaibot.bcgenrolls.com

## 📧 Deployment Information

**Email for Vercel Account**: `melodie@ultimateonlinerevenue.com`  
**Subdomain**: `amerivetaibot.bcgenrolls.com`
**Employee Password**: `amerivet2024!` (for employees to access)
**Admin Password**: `admin2024!` (for admin features access)

## 🔧 Quick Setup Steps

### 1. Vercel Account Setup
1. Go to [vercel.com](https://vercel.com)
2. Sign up with email: `melodie@ultimateonlinerevenue.com`
3. Choose "Import Git Repository" when prompted
4. Connect your GitHub account

### 2. Deploy from GitHub
1. In Vercel dashboard, click "New Project"
2. Import from GitHub: `sonalmogra28/benefitsaichatbot`
3. Configure project settings:
   - **Project Name**: `amerivetaibot-bcgenrolls`
   - **Framework Preset**: Next.js
   - **Root Directory**: `./` (leave as default)

### 3. Environment Variables
Add these environment variables in Vercel dashboard:

```
NEXT_PUBLIC_APP_URL=https://amerivetaibot.bcgenrolls.com
NEXT_PUBLIC_DEPLOYMENT_MODE=subdomain
NEXT_PUBLIC_SUBDOMAIN=amerivetaibot
SHARED_PASSWORD_HASH=a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3
HEAD

ADMIN_PASSWORD_HASH=ef92b778bafe771e89245b89ecbc08a44a4e99c14987145f19b220287fad9279

JWT_SECRET=amerivet-benefits-2024-secret-key-change-in-production
```

### 4. Custom Domain Setup
1. In Vercel dashboard, go to your project
2. Click "Settings" → "Domains"
3. Add domain: `amerivetaibot.bcgenrolls.com`
4. Follow DNS configuration instructions

## 🌐 Access Information

**URL**: `https://amerivetaibot.bcgenrolls.com`  
**Login URL**: `https://amerivetaibot.bcgenrolls.com/subdomain/login`
**Employee Password**: `amerivet2024!` (Basic access)
**Admin Password**: `admin2024!` (Full admin features)

## 📱 Employee Instructions

1. **Click the link**: `amerivetaibot.bcgenrolls.com`
2. **Enter password**: `amerivet2024!`
3. **Optional fields** (can be left blank):
   - Email: `your.email@company.com`
   - Name: `Your Name`
   - Company ID: `amerivet`
4. **Click "Sign In"**
5. **Access AI Assistant** immediately

## 🔧 Admin Instructions

1. **Click the link**: `amerivetaibot.bcgenrolls.com`
2. **Enter password**: `admin2024!`
3. **Optional fields** (can be left blank):
   - Email: `admin@amerivet.com`
   - Name: `Admin User`
   - Company ID: `amerivet`
4. **Click "Sign In"**
5. **Access Admin Dashboard** with full features:
   - Real-time analytics
   - Content management (CMS)
   - Cost monitoring
   - User management
   - System settings

## 🔐 Security Features

- ✅ **Dual Password Authentication** (Employee + Admin)
- ✅ **Role-Based Access Control** (RBAC)
- ✅ **Rate Limiting**: 3 attempts per 15 minutes
- ✅ **Session Management**: 24-hour sessions
- ✅ **Security Headers**: XSS, CSRF protection
- ✅ **SSL/TLS**: Automatic HTTPS

## 📊 Monitoring

- **Vercel Dashboard**: Monitor usage and performance
- **Analytics**: Built-in Vercel analytics
- **Health Check**: `https://amerivetaibot.bcgenrolls.com/api/health`

## 🚀 Automated Deployment

I've created a deployment script that you can run:

```powershell
.\scripts\deploy-vercel-subdomain.ps1 -SharedPassword "amerivet2024!"
```

This script will:
1. Install dependencies
2. Build the application
3. Configure Vercel settings
4. Deploy to production

## 📋 DNS Configuration

For the domain `amerivetaibot.bcgenrolls.com`, you'll need to:

1. **Add CNAME record**:
   - Name: `amerivetaibot`
   - Value: `cname.vercel-dns.com`
   - TTL: 300

2. **Or add A record** (if CNAME not supported):
   - Name: `amerivetaibot`
   - Value: `76.76.19.61` (Vercel's IP)
   - TTL: 300

## 🎯 Features Available

### **Employee Features:**
- **AI Chat Assistant**: Ask questions about benefits
- **Benefits Calculator**: Calculate costs and savings
- **Document Center**: Access benefit documents
- **Plan Comparison**: Compare different benefit plans
- **Responsive Design**: Works on all devices

### **Admin Features (Phase 2):**
- **Real-time Analytics Dashboard**: Live usage metrics and performance data
- **Content Management System (CMS)**: Manage FAQs and content
- **Cost Monitoring**: Track spending and set budget alerts
- **Conversation Quality Scoring**: Monitor AI response quality
- **User Management**: Manage employee access and permissions
- **System Settings**: Configure application settings
## 🔧 Troubleshooting

### If deployment fails:
1. Check environment variables are set correctly
2. Ensure GitHub repository is connected
3. Verify domain DNS settings

### If employees can't access:
1. Verify the employee password: `amerivet2024!`
2. Check if domain is properly configured
3. Clear browser cache and cookies

### If admin features aren't accessible:
1. Verify the admin password: `admin2024!`
2. Check if ADMIN_PASSWORD_HASH environment variable is set
3. Ensure user has admin role after login
4. Check browser console for permission errors
### If AI chat doesn't work:
1. Check if OpenAI API key is set in environment variables
2. Verify API endpoints are accessible
3. Check Vercel function logs

## 📞 Support

For any issues:
1. Check Vercel dashboard logs
2. Verify environment variables
3. Test individual components
4. Contact support if needed

---

**Status**: ✅ **READY FOR DEPLOYMENT**

The application is configured and ready to deploy to `amerivetaibot.bcgenrolls.com` with shared password authentication and rate limiting.
