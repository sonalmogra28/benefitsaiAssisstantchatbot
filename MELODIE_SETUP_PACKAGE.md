# 🚀 Melodie's Vercel Setup Package for amerivetaibot.bcgenrolls.com

## 📧 Contact Information
**Primary Contact**: Melodie Henderson  
**Email**: melodie@ultimateonlinerevenue.com  
**Support Phone**: 888-217-4728  
**Technical Lead**: Sonal (sonalmogra.888@gmail.com)

---

## 🌐 DNS Configuration for amerivetaibot.bcgenrolls.com

### DNS Records to Add:
```
Type: CNAME
Name: amerivetaibot
Value: cname.vercel-dns.com
TTL: 300

Alternative (if CNAME not supported):
Type: A
Name: amerivetaibot  
Value: 76.76.19.61
TTL: 300
```

### DNS Provider Instructions:
1. Log into your DNS provider (where bcgenrolls.com is managed)
2. Add the CNAME record above
3. Wait 5-10 minutes for propagation
4. Test with: `nslookup amerivetaibot.bcgenrolls.com`

---

## 🔐 Employee Access Information

### Single Shared Password for All Employees:
**Password**: `amerivet2024!`

### Access Instructions for Employees:
1. **Visit**: `https://amerivetaibot.bcgenrolls.com`
2. **Enter Password**: `amerivet2024!`
3. **Optional Fields** (can be left blank):
   - Email: `your.email@company.com`
   - Name: `Your Name`
   - Company ID: `amerivet`
4. **Click "Sign In"**
5. **Access AI Assistant** immediately

### Test Employee Emails for UAT:
```
1. test.employee1@amerivet.com
2. test.employee2@amerivet.com  
3. test.manager@amerivet.com
4. test.admin@amerivet.com
5. test.hr@amerivet.com
```

**Note**: All test accounts use the same shared password: `amerivet2024!`

---

## 🚀 Vercel Setup Guide for Melodie

### Step 1: Create Vercel Account
1. Go to [vercel.com](https://vercel.com)
2. Click "Sign Up"
3. Use email: `melodie@ultimateonlinerevenue.com`
4. Choose "Continue with Email"
5. Verify email address

### Step 2: Import GitHub Repository
1. In Vercel dashboard, click "New Project"
2. Click "Import Git Repository"
3. Connect GitHub account if not already connected
4. Search for: `sonalmogra28/benefitsaichatbot`
5. Click "Import" next to the repository

### Step 3: Configure Project Settings
**Project Name**: `amerivetaibot-bcgenrolls`  
**Framework Preset**: Next.js (auto-detected)  
**Root Directory**: `./` (leave as default)  
**Build Command**: `npm run build` (auto-detected)  
**Output Directory**: `.next` (auto-detected)

### Step 4: Set Environment Variables
In the "Environment Variables" section, add:

```
NEXT_PUBLIC_APP_URL = https://amerivetaibot.bcgenrolls.com
NEXT_PUBLIC_DEPLOYMENT_MODE = subdomain
NEXT_PUBLIC_SUBDOMAIN = amerivetaibot
SHARED_PASSWORD_HASH = a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3
JWT_SECRET = amerivet-benefits-2024-secret-key-change-in-production
```

**Important**: Make sure to add these BEFORE deploying!

### Step 5: Deploy
1. Click "Deploy" button
2. Wait for deployment to complete (2-3 minutes)
3. Note the deployment URL (will be something like `amerivetaibot-bcgenrolls.vercel.app`)

### Step 6: Configure Custom Domain
1. Go to project settings
2. Click "Domains" tab
3. Add domain: `amerivetaibot.bcgenrolls.com`
4. Follow DNS verification steps
5. Wait for SSL certificate (automatic, takes 5-10 minutes)

---

## 🧪 Testing Checklist

### Pre-Deployment Testing:
- [ ] Vercel account created
- [ ] GitHub repository imported
- [ ] Environment variables set
- [ ] Project deployed successfully

### Post-Deployment Testing:
- [ ] Domain resolves correctly
- [ ] SSL certificate active (green lock)
- [ ] Login page loads
- [ ] Shared password works
- [ ] AI chat functionality works
- [ ] Rate limiting active (test with multiple rapid requests)

### Employee Testing:
- [ ] Test with provided employee emails
- [ ] Verify all features work
- [ ] Test on mobile devices
- [ ] Test rate limiting (try 5+ rapid requests)

---

## 📊 Monitoring & Support

### Vercel Dashboard Access:
- **URL**: [vercel.com/dashboard](https://vercel.com/dashboard)
- **Login**: melodie@ultimateonlinerevenue.com
- **Project**: amerivetaibot-bcgenrolls

### Analytics Available:
- Page views and unique visitors
- Function execution metrics
- Error rates and logs
- Performance metrics

### Support Contacts:
- **Technical Issues**: Sonal (sonalmogra.888@gmail.com)
- **General Support**: 888-217-4728
- **Vercel Support**: Available in dashboard

---

## 🔧 Troubleshooting Guide

### Common Issues:

1. **Domain not resolving**:
   - Check DNS records are correct
   - Wait 10-15 minutes for propagation
   - Use `nslookup amerivetaibot.bcgenrolls.com` to test

2. **SSL certificate issues**:
   - Wait 10-15 minutes after adding domain
   - Check Vercel dashboard for certificate status
   - Clear browser cache

3. **Login not working**:
   - Verify password: `amerivet2024!`
   - Check browser console for errors
   - Try incognito/private browsing mode

4. **AI chat not responding**:
   - Check environment variables are set
   - Verify OpenAI API key (if using external AI)
   - Check Vercel function logs

### Debug Steps:
1. Check Vercel deployment logs
2. Test individual components
3. Verify environment variables
4. Contact support if needed

---

## 📋 Phase 2 & 3 Readiness

### Current Status: ✅ **Phase 1 Complete**
- [x] Subdomain deployment with shared password
- [x] Rate limiting implemented
- [x] Basic AI chat functionality
- [x] Security headers and protection
- [x] Responsive design

### Ready for Phase 2:
- [ ] Real-time analytics dashboard
- [ ] Content Management System (CMS)
- [ ] Performance analytics tools
- [ ] Document processing improvements
- [ ] Cost monitoring & guardrails

### Ready for Phase 3:
- [ ] Performance optimization (500 concurrent users)
- [ ] Advanced monitoring & alerting
- [ ] Complete documentation package
- [ ] Administrator & end-user training
- [ ] Final handover & knowledge transfer

---

## 💰 Payment Milestones

- **Phase 1**: ✅ Complete (Subdomain deployment)
- **Phase 2**: No payment milestone (Feature completion)
- **Phase 3**: $1,000 (Production readiness)
- **Final Handover**: $1,000 (Deployment + sign-off)

---

**Status**: 🚀 **READY FOR IMMEDIATE DEPLOYMENT**

All technical components are prepared and ready for Vercel deployment. Follow the setup guide above to get `amerivetaibot.bcgenrolls.com` live with shared password authentication and rate limiting.
