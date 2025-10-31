# Azure Deployment Guide for Benefits Assistant Chatbot
## For mograsonal10@gmail.com with Contributor + Application Administrator + Key Vault Administrator permissions

### Prerequisites ✅
- Azure account: `mograsonal10@gmail.com`
- Permissions: Contributor, Application Administrator, Key Vault Administrator
- Access to Azure Portal: https://portal.azure.com

---

## 🚀 Phase 1: Core Infrastructure (Day 1-2)

### Step 1: Create Resource Group
1. **Go to Azure Portal**: https://portal.azure.com
2. **Search for**: "Resource groups"
3. **Click**: "Create"
4. **Fill in**:
   - **Resource group name**: `benefits-chatbot-rg-dev`
   - **Region**: `East US`
5. **Click**: "Review + create" → "Create"

### Step 2: Create Cosmos DB
1. **Search for**: "Azure Cosmos DB"
2. **Click**: "Create"
3. **Fill in**:
   - **Subscription**: Your subscription
   - **Resource Group**: `benefits-chatbot-rg-dev`
   - **Account Name**: `benefits-chatbot-cosmos-dev`
   - **API**: `Core (SQL)`
   - **Location**: `East US`
   - **Capacity mode**: `Serverless`
4. **Click**: "Review + create" → "Create"
5. **After creation**:
   - Go to the Cosmos DB account
   - Click "Keys" in the left menu
   - Copy the "URI" and "Primary Key"

### Step 3: Create Storage Account
1. **Search for**: "Storage accounts"
2. **Click**: "Create"
3. **Fill in**:
   - **Subscription**: Your subscription
   - **Resource Group**: `benefits-chatbot-rg-dev`
   - **Storage account name**: `benefitschatbotdev`
   - **Region**: `East US`
   - **Performance**: `Standard`
   - **Redundancy**: `LRS`
4. **Click**: "Review + create" → "Create"
5. **After creation**:
   - Go to the Storage Account
   - Click "Access keys" in the left menu
   - Copy the "Connection string"

### Step 4: Create Redis Cache
1. **Search for**: "Azure Cache for Redis"
2. **Click**: "Create"
3. **Fill in**:
   - **Subscription**: Your subscription
   - **Resource Group**: `benefits-chatbot-rg-dev`
   - **DNS name**: `benefits-chatbot-redis-dev`
   - **Location**: `East US`
   - **Pricing tier**: `Basic C0`
4. **Click**: "Review + create" → "Create"
5. **After creation**:
   - Go to the Redis Cache
   - Click "Access keys" in the left menu
   - Copy the "Primary connection string"

### Step 5: Create Application Insights
1. **Search for**: "Application Insights"
2. **Click**: "Create"
3. **Fill in**:
   - **Subscription**: Your subscription
   - **Resource Group**: `benefits-chatbot-rg-dev`
   - **Name**: `benefits-chatbot-insights-dev`
   - **Region**: `East US`
4. **Click**: "Review + create" → "Create"
5. **After creation**:
   - Go to Application Insights
   - Click "Overview"
   - Copy the "Connection String"

### Step 6: Create Key Vault
1. **Search for**: "Key vaults"
2. **Click**: "Create"
3. **Fill in**:
   - **Subscription**: Your subscription
   - **Resource Group**: `benefits-chatbot-rg-dev`
   - **Vault name**: `benefits-chatbot-vault-dev`
   - **Region**: `East US`
   - **Pricing tier**: `Standard`
4. **Click**: "Review + create" → "Create"
5. **After creation**:
   - Go to Key Vault
   - Click "Overview"
   - Copy the "Vault URI"

---

## 🔐 Phase 2: Authentication & Security (Day 3-4)

### Step 7: Azure AD B2C Setup
Follow the detailed guide: [Azure AD B2C Setup Guide](azure-ad-b2c-setup-mograsonal.md)

**Quick Summary**:
1. Create B2C tenant: `amerivetbenefits.onmicrosoft.com`
2. Create app registration: `Benefits Assistant Chatbot`
3. Configure redirect URIs: `http://localhost:3000`, `https://benefits-chatbot-dev.azurewebsites.net`
4. Create user flows: `B2C_1_susi`, `B2C_1_reset`, `B2C_1_editprofile`
5. Generate client secret

---

## 🚀 Phase 3: Application Deployment (Day 5-6)

### Step 8: Create App Service Plan
1. **Search for**: "App Service plans"
2. **Click**: "Create"
3. **Fill in**:
   - **Subscription**: Your subscription
   - **Resource Group**: `benefits-chatbot-rg-dev`
   - **Name**: `benefits-chatbot-plan-dev`
   - **Operating System**: `Linux`
   - **Region**: `East US`
   - **Pricing tier**: `B1 Basic`
4. **Click**: "Review + create" → "Create"

### Step 9: Create Web App
1. **Search for**: "Web App"
2. **Click**: "Create"
3. **Fill in**:
   - **Subscription**: Your subscription
   - **Resource Group**: `benefits-chatbot-rg-dev`
   - **Name**: `benefits-chatbot-dev`
   - **Runtime stack**: `Node 18 LTS`
   - **Operating System**: `Linux`
   - **Region**: `East US`
   - **App Service Plan**: `benefits-chatbot-plan-dev`
4. **Click**: "Review + create" → "Create"

### Step 10: Configure Application Settings
1. **Go to your Web App**
2. **Click**: "Configuration" in the left menu
3. **Add the following Application Settings**:

```env
# Azure Core Configuration
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret
AZURE_SUBSCRIPTION_ID=your-subscription-id
AZURE_RESOURCE_GROUP=benefits-chatbot-rg-dev
AZURE_LOCATION=East US

# Azure Cosmos DB Configuration
AZURE_COSMOS_ENDPOINT=https://benefits-chatbot-cosmos-dev.documents.azure.com:443/
AZURE_COSMOS_KEY=your-cosmos-primary-key
AZURE_COSMOS_DATABASE=benefits-chatbot-db
AZURE_COSMOS_CONTAINER_USERS=users
AZURE_COSMOS_CONTAINER_COMPANIES=companies
AZURE_COSMOS_CONTAINER_BENEFITS=benefits
AZURE_COSMOS_CONTAINER_CHATS=chats
AZURE_COSMOS_CONTAINER_DOCUMENTS=documents
AZURE_COSMOS_CONTAINER_FAQS=faqs
AZURE_COSMOS_CONTAINER_DOCUMENT_CHUNKS=document-chunks

# Azure Blob Storage Configuration
AZURE_STORAGE_ACCOUNT_NAME=benefitschatbotdev
AZURE_STORAGE_ACCOUNT_KEY=your-storage-key
AZURE_STORAGE_CONNECTION_STRING=USE_KEYVAULT_OR_CI
AZURE_STORAGE_CONTAINER_DOCUMENTS=documents
AZURE_STORAGE_CONTAINER_IMAGES=images

# Azure Cache for Redis Configuration
AZURE_REDIS_HOST=benefits-chatbot-redis-dev.redis.cache.windows.net
AZURE_REDIS_PORT=6380
AZURE_REDIS_PASSWORD=your-redis-password
AZURE_REDIS_SSL=true
REDIS_URL=rediss://benefits-chatbot-redis-dev.redis.cache.windows.net:6380

# Azure Monitor Configuration
AZURE_APPLICATION_INSIGHTS_CONNECTION_STRING=your-app-insights-connection-string
AZURE_LOG_ANALYTICS_WORKSPACE_ID=your-workspace-id
AZURE_LOG_ANALYTICS_SHARED_KEY=your-shared-key

# Azure Key Vault Configuration
AZURE_KEY_VAULT_URL=https://benefits-chatbot-vault-dev.vault.azure.net/
AZURE_KEY_VAULT_CLIENT_ID=your-keyvault-client-id
AZURE_KEY_VAULT_CLIENT_SECRET=your-keyvault-client-secret

# Security Configuration
JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters-long
ENCRYPTION_KEY=your-32-character-encryption-key

# Rate Limiting Configuration
RATE_LIMIT_REDIS_URL=rediss://benefits-chatbot-redis-dev.redis.cache.windows.net:6380

# File Upload Configuration
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=pdf,doc,docx,txt

# Development Configuration
AZURE_USE_EMULATOR=false
AZURE_DEBUG_MODE=true
LOG_LEVEL=debug

# Next.js Configuration
NEXT_PUBLIC_APP_URL=https://benefits-chatbot-dev.azurewebsites.net
NEXT_PUBLIC_AZURE_AD_CLIENT_ID=your-b2c-client-id
NEXT_PUBLIC_AZURE_AD_TENANT_NAME=amerivetbenefits.onmicrosoft.com
NEXT_PUBLIC_AZURE_AD_SIGNUP_SIGNIN_POLICY=B2C_1_susi
```

4. **Click**: "Save"

---

## 🤖 Phase 4: AI & Communication Services (Day 7)

### Step 11: Create Cosmos DB Containers
1. **Go to your Cosmos DB account**
2. **Click**: "Data Explorer"
3. **Click**: "New Container" for each container:

   **Container 1: users**
   - Database ID: `benefits-chatbot-db`
   - Container ID: `users`
   - Partition key: `/id`

   **Container 2: companies**
   - Database ID: `benefits-chatbot-db`
   - Container ID: `companies`
   - Partition key: `/id`

   **Container 3: benefits**
   - Database ID: `benefits-chatbot-db`
   - Container ID: `benefits`
   - Partition key: `/id`

   **Container 4: chats**
   - Database ID: `benefits-chatbot-db`
   - Container ID: `chats`
   - Partition key: `/id`

   **Container 5: documents**
   - Database ID: `benefits-chatbot-db`
   - Container ID: `documents`
   - Partition key: `/id`

   **Container 6: faqs**
   - Database ID: `benefits-chatbot-db`
   - Container ID: `faqs`
   - Partition key: `/id`

   **Container 7: document-chunks**
   - Database ID: `benefits-chatbot-db`
   - Container ID: `document-chunks`
   - Partition key: `/id`

### Step 12: Create Storage Containers
1. **Go to your Storage Account**
2. **Click**: "Containers" in the left menu
3. **Click**: "Container" for each container:

   **Container 1: documents**
   - Name: `documents`
   - Public access level: `Private`

   **Container 2: images**
   - Name: `images`
   - Public access level: `Private`

### Step 13: Deploy Application
1. **Go to your Web App**
2. **Click**: "Deployment Center" in the left menu
3. **Choose**: "GitHub" as source
4. **Connect**: Your GitHub repository
5. **Deploy**: The main branch

---

## ✅ Verification Checklist

### Infrastructure
- [ ] Resource group created
- [ ] Cosmos DB account created and accessible
- [ ] Storage account created with containers
- [ ] Redis cache created and accessible
- [ ] Application Insights created
- [ ] Key Vault created

### Authentication
- [ ] Azure AD B2C tenant created
- [ ] App registration configured
- [ ] User flows created
- [ ] Client secret generated

### Application
- [ ] App Service plan created
- [ ] Web App created
- [ ] Application settings configured
- [ ] Cosmos DB containers created
- [ ] Storage containers created
- [ ] Application deployed successfully

### Testing
- [ ] Application accessible via URL
- [ ] Authentication flow works
- [ ] Database connections work
- [ ] AI features functional
- [ ] File upload works
- [ ] Admin portals accessible

---

## 🎯 Expected Timeline

- **Day 1-2**: Infrastructure setup (4-6 hours)
- **Day 3-4**: Authentication configuration (2-3 hours)
- **Day 5-6**: Application deployment (3-4 hours)
- **Day 7**: Testing and optimization (2-3 hours)

**Total**: 11-16 hours over 7 days

---

## 🆘 Troubleshooting

### Common Issues:
1. **Permission Errors**: Ensure you have Contributor access
2. **Resource Name Conflicts**: Use unique names with your initials
3. **Connection String Issues**: Double-check all connection strings
4. **Deployment Failures**: Check application settings and environment variables

### Support:
- **Azure Portal**: Use the built-in help and documentation
- **GitHub Issues**: Report bugs and issues
- **Documentation**: Refer to the setup guides in `docs/`

---

## 🚀 Next Steps After Deployment

1. **Test End-to-End**: Verify all features work
2. **Monitor Performance**: Use Application Insights
3. **Optimize Costs**: Review and adjust resource sizes
4. **Scale Up**: Add more resources as needed
5. **Security Review**: Conduct security audit
6. **User Testing**: Get feedback from end users

**Current Status**: Ready for Azure deployment! 🎉

