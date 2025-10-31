# Benefits AI Chatbot API Documentation

## Overview

The Benefits AI Chatbot API provides a comprehensive set of endpoints for managing benefits information, user interactions, and administrative functions. The API is built with Next.js 14 and follows RESTful principles.

## Base URL

- **Development**: `http://localhost:3000/api`
- **Staging**: `https://staging.benefitsbot.com/api`
- **Production**: `https://benefitsbot.com/api`

## Authentication

The API uses Azure AD B2C for authentication with role-based access control:

- **Employee**: Basic user access
- **Admin**: Company-level administration
- **Super Admin**: Platform-wide administration

### Headers

All authenticated requests must include:

```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
X-User-ID: <user_id>
```

## Rate Limiting

- **Default**: 100 requests per 15 minutes
- **Admin**: 500 requests per 15 minutes
- **Super Admin**: 1000 requests per 15 minutes

## Error Handling

All errors follow a consistent format:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional error details"
  }
}
```

## Endpoints

### Health & Status

#### GET /api/health
Check system health status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "version": "1.0.0",
  "services": {
    "database": "healthy",
    "ai": "healthy",
    "storage": "healthy"
  }
}
```

#### GET /api/health/db
Check database connectivity.

**Response:**
```json
{
  "status": "healthy",
  "database": "cosmos_db",
  "responseTime": 45
}
```

#### GET /api/health/ai
Check AI service availability.

**Response:**
```json
{
  "status": "healthy",
  "models": {
    "gpt-4": "available",
    "gpt-3.5-turbo": "available"
  },
  "responseTime": 120
}
```

### Authentication

#### GET /api/auth/status
Get current user authentication status.

**Headers:**
- `Authorization: Bearer <token>`

**Response:**
```json
{
  "authenticated": true,
  "user": {
    "id": "user_123",
    "email": "user@company.com",
    "roles": ["employee"],
    "companyId": "company_456"
  }
}
```

#### POST /api/auth/login
Authenticate user (handled by Azure AD B2C).

**Request:**
```json
{
  "email": "user@company.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt_token_here",
  "user": {
    "id": "user_123",
    "email": "user@company.com",
    "roles": ["employee"]
  }
}
```

### Chat & Messaging

#### POST /api/chat
Send a message to the AI chatbot.

**Headers:**
- `Authorization: Bearer <token>`
- `X-User-ID: <user_id>`

**Request:**
```json
{
  "message": "What are my health insurance benefits?",
  "conversationId": "conv_123",
  "context": {
    "companyId": "company_456",
    "userId": "user_123"
  }
}
```

**Response:**
```json
{
  "success": true,
  "response": "Your health insurance benefits include...",
  "conversationId": "conv_123",
  "messageId": "msg_789",
  "metadata": {
    "model": "gpt-4",
    "tokens": 150,
    "cost": 0.003,
    "responseTime": 1200
  }
}
```

#### GET /api/chat/conversations
Get user's conversation history.

**Headers:**
- `Authorization: Bearer <token>`
- `X-User-ID: <user_id>`

**Query Parameters:**
- `limit` (optional): Number of conversations to return (default: 20)
- `offset` (optional): Number of conversations to skip (default: 0)

**Response:**
```json
{
  "success": true,
  "conversations": [
    {
      "id": "conv_123",
      "title": "Health Insurance Benefits",
      "lastMessage": "What are my health insurance benefits?",
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:35:00Z",
      "messageCount": 5
    }
  ],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 1
  }
}
```

#### GET /api/chat/conversations/{conversationId}/messages
Get messages in a specific conversation.

**Headers:**
- `Authorization: Bearer <token>`
- `X-User-ID: <user_id>`

**Response:**
```json
{
  "success": true,
  "messages": [
    {
      "id": "msg_123",
      "content": "What are my health insurance benefits?",
      "role": "user",
      "timestamp": "2024-01-15T10:30:00Z"
    },
    {
      "id": "msg_124",
      "content": "Your health insurance benefits include...",
      "role": "assistant",
      "timestamp": "2024-01-15T10:30:05Z",
      "metadata": {
        "model": "gpt-4",
        "tokens": 150
      }
    }
  ]
}
```

### Documents

#### POST /api/documents/upload
Upload a document for processing.

**Headers:**
- `Authorization: Bearer <token>`
- `X-User-ID: <user_id>`

**Request:** (multipart/form-data)
- `file`: Document file (PDF, DOC, DOCX, TXT)
- `title`: Document title
- `description`: Document description (optional)

**Response:**
```json
{
  "success": true,
  "document": {
    "id": "doc_123",
    "title": "Employee Handbook 2024",
    "description": "Company benefits and policies",
    "fileName": "handbook.pdf",
    "fileSize": 2048576,
    "uploadedAt": "2024-01-15T10:30:00Z",
    "status": "processing"
  }
}
```

#### GET /api/documents
Get user's uploaded documents.

**Headers:**
- `Authorization: Bearer <token>`
- `X-User-ID: <user_id>`

**Query Parameters:**
- `limit` (optional): Number of documents to return (default: 20)
- `offset` (optional): Number of documents to skip (default: 0)
- `status` (optional): Filter by status (processing, completed, failed)

**Response:**
```json
{
  "success": true,
  "documents": [
    {
      "id": "doc_123",
      "title": "Employee Handbook 2024",
      "fileName": "handbook.pdf",
      "fileSize": 2048576,
      "status": "completed",
      "uploadedAt": "2024-01-15T10:30:00Z",
      "processedAt": "2024-01-15T10:32:00Z"
    }
  ],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 1
  }
}
```

#### GET /api/documents/{documentId}
Get specific document details.

**Headers:**
- `Authorization: Bearer <token>`
- `X-User-ID: <user_id>`

**Response:**
```json
{
  "success": true,
  "document": {
    "id": "doc_123",
    "title": "Employee Handbook 2024",
    "description": "Company benefits and policies",
    "fileName": "handbook.pdf",
    "fileSize": 2048576,
    "status": "completed",
    "uploadedAt": "2024-01-15T10:30:00Z",
    "processedAt": "2024-01-15T10:32:00Z",
    "chunks": [
      {
        "id": "chunk_1",
        "content": "Health insurance benefits include...",
        "pageNumber": 1
      }
    ]
  }
}
```

### Analytics

#### GET /api/admin/analytics
Get company analytics (Admin only).

**Headers:**
- `Authorization: Bearer <token>`
- `X-User-ID: <user_id>`

**Query Parameters:**
- `timeRange` (optional): Time range for analytics (7d, 30d, 90d, 1y)
- `tenantId` (optional): Specific tenant ID

**Response:**
```json
{
  "success": true,
  "analytics": {
    "totalUsers": 150,
    "totalMessages": 1250,
    "totalDocuments": 45,
    "averageResponseTime": 1.2,
    "totalCost": 234.50,
    "monthlyTrend": [
      {
        "month": "2024-01",
        "users": 120,
        "messages": 1000,
        "cost": 200.00
      }
    ],
    "userEngagement": {
      "activeUsers": 85,
      "newUsers": 15,
      "retentionRate": 0.85
    }
  }
}
```

#### GET /api/super-admin/stats
Get platform-wide statistics (Super Admin only).

**Headers:**
- `Authorization: Bearer <token>`
- `X-User-ID: <user_id>`

**Response:**
```json
{
  "success": true,
  "data": {
    "totalUsers": 1500,
    "totalDocuments": 450,
    "totalBenefitPlans": 25,
    "activeEnrollments": 1200,
    "activeChats": 350,
    "monthlyGrowth": 0.15,
    "systemHealth": "healthy",
    "apiUsage": 50000,
    "storageUsed": 1073741824,
    "systemMetrics": {
      "cpuUsage": 45.2,
      "memoryUsage": 67.8,
      "diskUsage": 23.1,
      "networkLatency": 120,
      "errorRate": 0.02,
      "uptime": 99.9
    }
  }
}
```

### Company Management

#### GET /api/admin/companies
Get list of companies (Admin only).

**Headers:**
- `Authorization: Bearer <token>`
- `X-User-ID: <user_id>`

**Response:**
```json
{
  "success": true,
  "companies": [
    {
      "id": "company_123",
      "name": "Acme Corp",
      "status": "active",
      "userCount": 150,
      "createdAt": "2024-01-01T00:00:00Z",
      "lastActive": "2024-01-15T10:30:00Z"
    }
  ]
}
```

#### POST /api/admin/companies
Create a new company (Super Admin only).

**Headers:**
- `Authorization: Bearer <token>`
- `X-User-ID: <user_id>`

**Request:**
```json
{
  "name": "New Company",
  "domain": "newcompany.com",
  "adminEmail": "admin@newcompany.com",
  "settings": {
    "maxUsers": 1000,
    "features": {
      "aiChat": true,
      "documentUpload": true,
      "analytics": true
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "company": {
    "id": "company_456",
    "name": "New Company",
    "domain": "newcompany.com",
    "status": "active",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

### User Management

#### GET /api/admin/users
Get list of users (Admin only).

**Headers:**
- `Authorization: Bearer <token>`
- `X-User-ID: <user_id>`

**Query Parameters:**
- `companyId` (optional): Filter by company ID
- `status` (optional): Filter by status (active, inactive)
- `limit` (optional): Number of users to return (default: 20)
- `offset` (optional): Number of users to skip (default: 0)

**Response:**
```json
{
  "success": true,
  "users": [
    {
      "id": "user_123",
      "email": "user@company.com",
      "name": "John Doe",
      "roles": ["employee"],
      "status": "active",
      "lastActive": "2024-01-15T10:30:00Z",
      "companyId": "company_456"
    }
  ],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 1
  }
}
```

#### POST /api/admin/users
Create a new user (Admin only).

**Headers:**
- `Authorization: Bearer <token>`
- `X-User-ID: <user_id>`

**Request:**
```json
{
  "email": "newuser@company.com",
  "name": "Jane Smith",
  "companyId": "company_456",
  "roles": ["employee"]
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user_789",
    "email": "newuser@company.com",
    "name": "Jane Smith",
    "roles": ["employee"],
    "status": "active",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

### Benefits Management

#### GET /api/benefits
Get available benefits for user's company.

**Headers:**
- `Authorization: Bearer <token>`
- `X-User-ID: <user_id>`

**Response:**
```json
{
  "success": true,
  "benefits": [
    {
      "id": "benefit_123",
      "name": "Health Insurance",
      "type": "health",
      "description": "Comprehensive health coverage",
      "coverage": {
        "medical": "80%",
        "dental": "50%",
        "vision": "100%"
      },
      "cost": {
        "employee": 200.00,
        "employer": 800.00
      }
    }
  ]
}
```

#### GET /api/benefits/compare
Compare benefit plans.

**Headers:**
- `Authorization: Bearer <token>`
- `X-User-ID: <user_id>`

**Query Parameters:**
- `plans`: Comma-separated list of plan IDs

**Response:**
```json
{
  "success": true,
  "comparison": {
    "plans": [
      {
        "id": "plan_123",
        "name": "Basic Plan",
        "monthlyCost": 150.00,
        "deductible": 1000.00,
        "coverage": "80%"
      },
      {
        "id": "plan_456",
        "name": "Premium Plan",
        "monthlyCost": 250.00,
        "deductible": 500.00,
        "coverage": "90%"
      }
    ],
    "recommendations": [
      {
        "planId": "plan_456",
        "reason": "Better coverage for your usage pattern"
      }
    ]
  }
}
```

## Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `UNAUTHORIZED` | Authentication required | 401 |
| `FORBIDDEN` | Insufficient permissions | 403 |
| `NOT_FOUND` | Resource not found | 404 |
| `VALIDATION_ERROR` | Request validation failed | 400 |
| `RATE_LIMIT_EXCEEDED` | Too many requests | 429 |
| `INTERNAL_ERROR` | Server error | 500 |
| `SERVICE_UNAVAILABLE` | Service temporarily unavailable | 503 |

## SDKs and Examples

### JavaScript/TypeScript

```typescript
import { BenefitsChatbotAPI } from '@benefits-chatbot/sdk';

const api = new BenefitsChatbotAPI({
  baseUrl: 'https://benefitsbot.com/api',
  apiKey: 'your-api-key'
});

// Send a chat message
const response = await api.chat.sendMessage({
  message: 'What are my health insurance benefits?',
  conversationId: 'conv_123'
});

console.log(response.data.response);
```

### Python

```python
import requests

class BenefitsChatbotAPI:
    def __init__(self, base_url, api_key):
        self.base_url = base_url
        self.headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        }
    
    def send_message(self, message, conversation_id=None):
        response = requests.post(
            f'{self.base_url}/chat',
            json={
                'message': message,
                'conversationId': conversation_id
            },
            headers=self.headers
        )
        return response.json()

# Usage
api = BenefitsChatbotAPI('https://benefitsbot.com/api', 'your-api-key')
result = api.send_message('What are my health insurance benefits?')
print(result['response'])
```

### cURL Examples

```bash
# Send a chat message
curl -X POST https://benefitsbot.com/api/chat \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -H "X-User-ID: user_123" \
  -d '{
    "message": "What are my health insurance benefits?",
    "conversationId": "conv_123"
  }'

# Get analytics
curl -X GET "https://benefitsbot.com/api/admin/analytics?timeRange=30d" \
  -H "Authorization: Bearer your-token" \
  -H "X-User-ID: user_123"
```

## Webhooks

The API supports webhooks for real-time notifications:

### Webhook Events

- `user.created` - New user created
- `user.updated` - User information updated
- `conversation.started` - New conversation started
- `conversation.ended` - Conversation ended
- `document.uploaded` - Document uploaded
- `document.processed` - Document processing completed
- `error.occurred` - System error occurred

### Webhook Payload

```json
{
  "event": "conversation.started",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "conversationId": "conv_123",
    "userId": "user_123",
    "companyId": "company_456"
  }
}
```

## Rate Limits

| Endpoint Category | Limit | Window |
|------------------|-------|--------|
| Health checks | 1000 | 1 hour |
| Chat messages | 100 | 15 minutes |
| Document uploads | 10 | 1 hour |
| Analytics | 50 | 15 minutes |
| Admin operations | 200 | 15 minutes |

## Support

For API support and questions:

- **Documentation**: [https://docs.benefitsbot.com](https://docs.benefitsbot.com)
- **Support Email**: api-support@benefitsbot.com
- **Status Page**: [https://status.benefitsbot.com](https://status.benefitsbot.com)
- **GitHub Issues**: [https://github.com/benefitsbot/api/issues](https://github.com/benefitsbot/api/issues)
