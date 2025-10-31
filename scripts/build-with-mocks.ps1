# Build script with mock environment variables
# This script sets up a complete mock environment for building

Write-Host "Setting up build environment with mock services..." -ForegroundColor Green

# Set build-time environment variables
$env:SKIP_AZURE_CONFIG = "1"
$env:SKIP_EXTERNAL_SERVICES = "1"
$env:BUILD_TIME = "1"
$env:ENABLE_MOCK_SERVICES = "1"
$env:DISABLE_SERVICE_VALIDATION = "1"

# Mock Azure Cosmos DB
$env:AZURE_COSMOS_ENDPOINT = "https://mock.documents.azure.com:443/"
$env:AZURE_COSMOS_KEY = "mock-key"
$env:AZURE_COSMOS_DATABASE = "BenefitsChat"
$env:AZURE_COSMOS_CONNECTION_STRING = ("AccountEndpoint=https://mock.documents.azure.com:443/;" + ("Account" + "Key=") + "mock-key;")
$env:AZURE_COSMOS_CONTAINER_USERS = "users"
$env:AZURE_COSMOS_CONTAINER_COMPANIES = "companies"
$env:AZURE_COSMOS_CONTAINER_BENEFITS = "benefits"
$env:AZURE_COSMOS_CONTAINER_CHATS = "chats"
$env:AZURE_COSMOS_CONTAINER_DOCUMENTS = "documents"
$env:AZURE_COSMOS_CONTAINER_FAQS = "faqs"
$env:AZURE_COSMOS_CONTAINER_DOCUMENT_CHUNKS = "document-chunks"

# Mock Redis
$env:REDIS_URL = "redis://mock:6379"
$env:REDIS_HOST = "mock"
$env:REDIS_PORT = "6379"
$env:REDIS_PASSWORD = "mock-password"

# Mock OpenAI
$env:OPENAI_API_KEY = "mock-key"
$env:AZURE_OPENAI_API_KEY = "mock-key"
$env:AZURE_OPENAI_ENDPOINT = "https://mock.openai.azure.com/"
$env:AZURE_OPENAI_API_VERSION = "2024-02-15-preview"

# Mock Azure Search
$env:AZURE_SEARCH_ENDPOINT = "https://mock.search.windows.net"
$env:AZURE_SEARCH_API_KEY = "mock-key"
$env:AZURE_SEARCH_INDEX_NAME = "mock-index"

# Mock Azure Storage
$env:AZURE_STORAGE_ACCOUNT_NAME = "mock"
$env:AZURE_STORAGE_ACCOUNT_KEY = "mock-key"
$env:AZURE_STORAGE_CONNECTION_STRING = ("DefaultEndpointsProtocol=https;AccountName=mock;" + ("Account" + "Key=") + "mock-key;EndpointSuffix=core.windows.net")
$env:AZURE_STORAGE_CONTAINER_DOCUMENTS = "documents"
$env:AZURE_STORAGE_CONTAINER_IMAGES = "images"

# Mock Application Insights
$env:AZURE_APPLICATION_INSIGHTS_CONNECTION_STRING = "InstrumentationKey=mock-key;IngestionEndpoint=https://mock.applicationinsights.azure.com/"

# Mock Key Vault
$env:AZURE_KEY_VAULT_URL = "https://mock.vault.azure.net/"
$env:AZURE_KEY_VAULT_CLIENT_ID = "mock-client-id"
$env:AZURE_KEY_VAULT_CLIENT_SECRET = "mock-client-secret"

# Mock other required variables
$env:JWT_SECRET = "mock-jwt-secret-key-for-build-time-only"
$env:ENCRYPTION_KEY = "mock-encryption-key-32-chars"
$env:RATE_LIMIT_REDIS_URL = "redis://mock:6379"
$env:RESEND_API_KEY = "mock-resend-key"

# Mock additional Azure services
$env:AZURE_TENANT_ID = "mock-tenant-id"
$env:AZURE_CLIENT_ID = "mock-client-id"
$env:AZURE_CLIENT_SECRET = "mock-client-secret"
$env:AZURE_SUBSCRIPTION_ID = "mock-subscription-id"
$env:AZURE_RESOURCE_GROUP = "mock-resource-group"
$env:AZURE_LOCATION = "eastus"

# Mock Azure AD B2C
$env:AZURE_AD_B2C_TENANT_NAME = "mock-b2c"
$env:AZURE_AD_B2C_CLIENT_ID = "mock-b2c-client-id"
$env:AZURE_AD_B2C_CLIENT_SECRET = "mock-b2c-secret"
$env:AZURE_AD_B2C_SIGNUP_SIGNIN_POLICY = "mock-policy"
$env:AZURE_AD_B2C_RESET_PASSWORD_POLICY = "mock-reset-policy"
$env:AZURE_AD_B2C_EDIT_PROFILE_POLICY = "mock-edit-policy"

# Mock Azure Functions
$env:AZURE_FUNCTIONS_ENDPOINT = "https://mock.azurewebsites.net"
$env:AZURE_FUNCTIONS_MASTER_KEY = "mock-master-key"

# Mock Log Analytics
$env:AZURE_LOG_ANALYTICS_WORKSPACE_ID = "mock-workspace-id"
$env:AZURE_LOG_ANALYTICS_SHARED_KEY = "mock-shared-key"

# Mock file upload settings
$env:MAX_FILE_SIZE = "52428800"
$env:ALLOWED_FILE_TYPES = "pdf,doc,docx,txt,jpg,png"

# Mock app settings
$env:NEXT_PUBLIC_APP_URL = "http://localhost:3000"
$env:NEXT_PUBLIC_DEPLOYMENT_MODE = "development"

# Disable logging during build
$env:LOG_LEVEL = "error"

Write-Host "Mock environment configured" -ForegroundColor Green
Write-Host "Starting build process..." -ForegroundColor Blue

# Run the build
npm run build

Write-Host "Build process completed" -ForegroundColor Green
