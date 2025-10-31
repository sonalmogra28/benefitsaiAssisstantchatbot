# 🌐 Subdomain Deployment Guide

This guide explains how to deploy the Benefits Assistant Chatbot on a subdomain with shared password authentication and rate limiting.

## 🚀 Quick Start

### Option 1: Quick Local Testing
```powershell
# Run the quick deployment script
.\scripts\quick-deploy-subdomain.ps1 -Subdomain "demo" -Port 3001
```

This will start the application on `http://localhost:3001/subdomain/login`

### Option 2: Full Production Deployment
```powershell
# Run the full deployment script
.\scripts\deploy-subdomain.ps1 -Subdomain "benefits" -Domain "yourdomain.com" -SharedPassword "your-password"
```

## 🔐 Authentication

The subdomain deployment uses **shared password authentication** instead of Azure AD B2C:

- **Default Password**: `benefits2024!`
- **Session Duration**: 24 hours
- **Rate Limiting**: 3 attempts per 15 minutes
- **Security**: Password hashing with SHA-256

## 📁 Subdomain Structure

```
/subdomain/
├── login/           # Login page with shared password
├── dashboard/       # Main dashboard after login
├── chat/           # AI chat interface
├── analytics/      # Usage analytics
├── documents/      # Document management
└── calculator/     # Benefits calculator
```

## 🛠️ Features Implemented

### ✅ Authentication & Security
- [x] Shared password authentication
- [x] Session management with JWT-like tokens
- [x] Rate limiting on all endpoints
- [x] Password attempt limiting (5 attempts, 15min lockout)
- [x] Security headers (XSS, CSRF, etc.)
- [x] Input validation and sanitization

### ✅ Rate Limiting
- [x] API endpoints: 10 requests/second
- [x] Chat API: 5 requests/second
- [x] Auth API: 3 requests/second
- [x] Redis-based rate limiting
- [x] Per-IP and per-user limits

### ✅ User Interface
- [x] Responsive login page
- [x] Dashboard with feature cards
- [x] Real-time chat interface
- [x] Modern UI with Tailwind CSS
- [x] Loading states and error handling

### ✅ API Endpoints
- [x] `/api/subdomain/auth/login` - Authentication
- [x] `/api/chat` - AI chat functionality
- [x] `/api/health` - Health monitoring
- [x] Rate limiting on all endpoints

## 🔧 Configuration

### Environment Variables
```env
# Required
NEXT_PUBLIC_APP_URL=https://your-subdomain.yourdomain.com
NEXT_PUBLIC_DEPLOYMENT_MODE=subdomain
NEXT_PUBLIC_SUBDOMAIN=your-subdomain
SHARED_PASSWORD_HASH=your-hashed-password

# Optional (for full functionality)
AZURE_COSMOS_CONNECTION_STRING=your-cosmos-connection
AZURE_STORAGE_CONNECTION_STRING=your-storage-connection
OPENAI_API_KEY=your-openai-key
JWT_SECRET=your-jwt-secret
```

### Nginx Configuration
The deployment script generates a complete Nginx configuration with:
- SSL/TLS termination
- Rate limiting zones
- Security headers
- Proxy configuration
- Health checks

### Docker Configuration
- Multi-stage build for production
- Health checks
- Environment variable injection
- Volume mounting for data persistence

## 📊 Monitoring & Analytics

### Health Endpoints
- `GET /api/health` - System health
- `GET /api/health/db` - Database connectivity
- `GET /api/health/ai` - AI service status

### Rate Limiting Headers
All API responses include rate limiting information:
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 8
X-RateLimit-Reset: 1640995200
```

### Logging
- Authentication attempts
- Rate limit violations
- API errors
- User actions

## 🚀 Deployment Steps

### 1. Local Development
```bash
# Install dependencies
npm install

# Set environment variables
export NEXT_PUBLIC_APP_URL=http://localhost:3000
export NEXT_PUBLIC_DEPLOYMENT_MODE=subdomain

# Start development server
npm run dev
```

### 2. Production Deployment
```bash
# Build application
npm run build

# Start production server
npm start
```

### 3. Docker Deployment
```bash
# Build Docker image
docker build -f Dockerfile.subdomain -t benefits-chatbot .

# Run container
docker run -p 3000:3000 benefits-chatbot
```

### 4. Nginx Configuration
```bash
# Copy Nginx config
sudo cp nginx-your-subdomain.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/your-subdomain.conf /etc/nginx/sites-enabled/

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

## 🔒 Security Features

### Authentication Security
- Password hashing with SHA-256
- Timing-safe password comparison
- Session token validation
- Automatic session expiration

### Rate Limiting Security
- Multiple rate limiting zones
- Burst handling
- IP-based limiting
- User-based limiting

### Application Security
- Input validation with Zod schemas
- XSS protection headers
- CSRF protection
- SQL injection prevention
- File upload validation

## 🧪 Testing

### Manual Testing
1. Visit `/subdomain/login`
2. Enter shared password: `benefits2024!`
3. Test dashboard navigation
4. Test chat functionality
5. Test rate limiting (make multiple requests)

### Automated Testing
```bash
# Run unit tests
npm test

# Run E2E tests
npm run test:e2e

# Run type checking
npm run typecheck
```

## 📈 Performance

### Optimizations
- Next.js 15 with App Router
- Static generation where possible
- Image optimization
- Code splitting
- Caching strategies

### Monitoring
- Response time tracking
- Memory usage monitoring
- Error rate tracking
- User activity analytics

## 🐛 Troubleshooting

### Common Issues

1. **Authentication Fails**
   - Check `SHARED_PASSWORD_HASH` environment variable
   - Verify password is correctly hashed
   - Check session cookie settings

2. **Rate Limiting Issues**
   - Check Redis connection
   - Verify rate limit configuration
   - Check IP detection

3. **Build Errors**
   - Check Node.js version (18+)
   - Clear `.next` directory
   - Reinstall dependencies

4. **Nginx Issues**
   - Check configuration syntax: `nginx -t`
   - Verify SSL certificates
   - Check proxy settings

### Debug Mode
```bash
# Enable debug logging
export DEBUG=benefits-chatbot:*
npm run dev
```

## 📞 Support

For issues with subdomain deployment:
1. Check the logs: `docker-compose logs -f`
2. Verify environment variables
3. Test individual components
4. Check network connectivity

## 🎯 Next Steps

After successful subdomain deployment:
1. Configure SSL certificates
2. Set up monitoring and alerting
3. Implement backup strategies
4. Configure CDN if needed
5. Set up automated deployments

---

**Status**: ✅ **READY FOR DEPLOYMENT**

The subdomain deployment is complete with shared password authentication, rate limiting, and all required features. Follow the deployment steps above to get started.
