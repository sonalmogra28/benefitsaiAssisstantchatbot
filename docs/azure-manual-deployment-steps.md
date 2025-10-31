# Azure Manual Deployment Steps
## For mograsonal10@gmail.com with existing resource group

### Current Status ✅
- **Azure CLI**: Installed and authenticated
- **Account**: sonalmogra.888@gmail.com
- **Subscription**: Azure subscription 1 (ab57bda9-b1ed-4ca1-8755-1e137948cd9b)
- **Resource Group**: benefits-chatbot-project (Central US)
- **Permissions**: Limited (cannot create new resource groups)

### Step-by-Step Manual Deployment

#### Step 1: Go to Azure Portal
1. **Open**: https://portal.azure.com
2. **Sign in with**: sonalmogra.888@gmail.com
3. **Navigate to**: Resource Groups → benefits-chatbot-project

#### Step 2: Create Cosmos DB
1. **Click**: "+ Create" in the resource group
2. **Search for**: "Azure Cosmos DB"
3. **Click**: "Create"
4. **Fill in**:
   - **Subscription**: Azure subscription 1
   - **Resource Group**: benefits-chatbot-project
   - **Account Name**: `benefits-chatbot-cosmos-dev`
   - **API**: `Core (SQL)`
   - **Location**: `Central US`
   - **Capacity mode**: `Serverless`
5. **Click**: "Review + create" → "Create"
6. **Wait**: 5-10 minutes for deployment
7. **After creation**: Go to Keys → Copy "URI" and "Primary Key"

#### Step 3: Create Storage Account
1. **Click**: "+ Create" in the resource group
2. **Search for**: "Storage accounts"
3. **Click**: "Create"
4. **Fill in**:
   - **Subscription**: Azure subscription 1
   - **Resource Group**: benefits-chatbot-project
   - **Storage account name**: `benefitschatbotdev`
   - **Region**: `Central US`
   - **Performance**: `Standard`
   - **Redundancy**: `LRS`
5. **Click**: "Review + create" → "Create"
6. **After creation**: Go to Access keys → Copy "Connection string"

#### Step 4: Create Redis Cache
1. **Click**: "+ Create" in the resource group
2. **Search for**: "Azure Cache for Redis"
3. **Click**: "Create"
4. **Fill in**:
   - **Subscription**: Azure subscription 1
   - **Resource Group**: benefits-chatbot-project
   - **DNS name**: `benefits-chatbot-redis-dev`
   - **Location**: `Central US`
   - **Pricing tier**: `Basic C0`
5. **Click**: "Review + create" → "Create"
6. **After creation**: Go to Access keys → Copy "Primary connection string"

#### Step 5: Create Application Insights
1. **Click**: "+ Create" in the resource group
2. **Search for**: "Application Insights"
3. **Click**: "Create"
4. **Fill in**:
   - **Subscription**: Azure subscription 1
   - **Resource Group**: benefits-chatbot-project
   - **Name**: `benefits-chatbot-insights-dev`
   - **Region**: `Central US`
5. **Click**: "Review + create" → "Create"
6. **After creation**: Go to Overview → Copy "Connection String"

#### Step 6: Create Key Vault
1. **Click**: "+ Create" in the resource group
2. **Search for**: "Key vaults"
3. **Click**: "Create"
4. **Fill in**:
   - **Subscription**: Azure subscription 1
   - **Resource Group**: benefits-chatbot-project
   - **Vault name**: `benefits-chatbot-vault-dev`
   - **Region**: `Central US`
   - **Pricing tier**: `Standard`
5. **Click**: "Review + create" → "Create"
6. **After creation**: Go to Overview → Copy "Vault URI"

#### Step 7: Create App Service Plan
1. **Click**: "+ Create" in the resource group
2. **Search for**: "App Service plans"
3. **Click**: "Create"
4. **Fill in**:
   - **Subscription**: Azure subscription 1
   - **Resource Group**: benefits-chatbot-project
   - **Name**: `benefits-chatbot-plan-dev`
   - **Operating System**: `Linux`
   - **Region**: `Central US`
   - **Pricing tier**: `B1 Basic`
5. **Click**: "Review + create" → "Create"

#### Step 8: Create Web App
1. **Click**: "+ Create" in the resource group
2. **Search for**: "Web App"
3. **Click**: "Create"
4. **Fill in**:
   - **Subscription**: Azure subscription 1
   - **Resource Group**: benefits-chatbot-project
   - **Name**: `benefits-chatbot-dev`
   - **Runtime stack**: `Node 18 LTS`
   - **Operating System**: `Linux`
   - **Region**: `Central US`
   - **App Service Plan**: `benefits-chatbot-plan-dev`
5. **Click**: "Review + create" → "Create"

### Step 9: Configure Application Settings
1. **Go to your Web App**: benefits-chatbot-dev
2. **Click**: "Configuration" in the left menu
3. **Add the following Application Settings**:

```env
# Azure Core Configuration
AZURE_TENANT_ID=7c84c1e1-5fa5-4b5a-8b95-a9d8c24e53af
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret
AZURE_SUBSCRIPTION_ID=ab57bda9-b1ed-4ca1-8755-1e137948cd9b
AZURE_RESOURCE_GROUP=benefits-chatbot-project
AZURE_LOCATION=Central US

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

### Step 10: Create Cosmos DB Containers
1. **Go to your Cosmos DB account**: benefits-chatbot-cosmos-dev
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

### Step 11: Create Storage Containers
1. **Go to your Storage Account**: benefitschatbotdev
2. **Click**: "Containers" in the left menu
3. **Click**: "Container" for each container:

   **Container 1: documents**
   - Name: `documents`
   - Public access level: `Private`

   **Container 2: images**
   - Name: `images`
   - Public access level: `Private`

### Step 12: Deploy Application
1. **Go to your Web App**: benefits-chatbot-dev
2. **Click**: "Deployment Center" in the left menu
3. **Choose**: "GitHub" as source
4. **Connect**: Your GitHub repository (sonalmogra28/benefitsaichatbot)
5. **Deploy**: The main branch

### Expected Timeline
- **Steps 1-8**: 2-3 hours (resource creation)
- **Steps 9-12**: 1-2 hours (configuration and deployment)
- **Total**: 3-5 hours

### Next Steps After Deployment
1. **Test the application**: Visit https://benefits-chatbot-dev.azurewebsites.net
2. **Configure Azure AD B2C**: Follow the B2C setup guide
3. **Start P0 security fixes**: Begin with admin endpoint protection
4. **Complete analytics implementation**: Replace placeholder data

**Current Status**: Ready to begin manual Azure deployment! 🚀
