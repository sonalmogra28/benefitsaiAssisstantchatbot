# Developer API Guide - Benefits AI Chatbot

## Overview

The Benefits AI Chatbot provides a comprehensive REST API for integrating with external systems, managing users, and accessing AI-powered benefits assistance. This guide covers all available endpoints, authentication, and integration patterns.

## Table of Contents

1. [Authentication](#authentication)
2. [Base URL and Versioning](#base-url-and-versioning)
3. [API Endpoints](#api-endpoints)
4. [Error Handling](#error-handling)
5. [Rate Limiting](#rate-limiting)
6. [Webhooks](#webhooks)
7. [SDKs and Examples](#sdks-and-examples)
8. [Testing](#testing)

## Authentication

### API Key Authentication

All API requests require authentication using an API key in the `Authorization` header:

```http
Authorization: Bearer your-api-key-here
```

### Getting API Keys

1. Log into the admin dashboard
2. Navigate to **Settings** → **API Keys**
3. Click **Generate New Key**
4. Copy and securely store the key

### JWT Token Authentication

For user-specific operations, use JWT tokens:

```http
Authorization: Bearer <jwt_token>
```

## Base URL and Versioning

### Production
```
https://amerivetaibot.bcgenrolls.com/api/v1
```

### Development
```
http://localhost:3000/api/v1
```

### Versioning

The API uses URL-based versioning. Current version is `v1`. All endpoints are prefixed with `/api/v1/`.

## API Endpoints

### Chat API

#### Send Message
```http
POST /api/v1/chat
Content-Type: application/json
Authorization: Bearer your-token

{
  "message": "What are my health benefits?",
  "conversationId": "optional-conversation-id",
  "attachments": [
    {
      "type": "document",
      "url": "https://example.com/document.pdf"
    }
  ]
}
```

**Response:**
```json
{
  "id": "msg_123456",
  "conversationId": "conv_789012",
  "message": "What are my health benefits?",
  "response": "Your health benefits include comprehensive medical coverage...",
  "timestamp": "2024-12-19T10:30:00Z",
  "metadata": {
    "model": "gpt-4",
    "tokens": 150,
    "cost": 0.0023
  }
}
```

#### Get Conversation History
```http
GET /api/v1/chat/conversations/{conversationId}
Authorization: Bearer your-token
```

**Response:**
```json
{
  "conversationId": "conv_789012",
  "messages": [
    {
      "id": "msg_123456",
      "role": "user",
      "content": "What are my health benefits?",
      "timestamp": "2024-12-19T10:30:00Z"
    },
    {
      "id": "msg_123457",
      "role": "assistant",
      "content": "Your health benefits include...",
      "timestamp": "2024-12-19T10:30:05Z"
    }
  ],
  "createdAt": "2024-12-19T10:30:00Z",
  "updatedAt": "2024-12-19T10:30:05Z"
}
```

### Benefits API

#### Get Available Plans
```http
GET /api/v1/benefits/plans
Authorization: Bearer your-token
```

**Response:**
```json
{
  "plans": [
    {
      "id": "plan_001",
      "name": "Health Plus Plan",
      "type": "health",
      "monthlyCost": 450.00,
      "deductible": 1000,
      "coverage": {
        "medical": 80,
        "dental": 50,
        "vision": 25
      },
      "network": "PPO",
      "features": ["Prescription coverage", "Mental health", "Preventive care"]
    }
  ]
}
```

#### Compare Plans
```http
POST /api/v1/benefits/compare
Content-Type: application/json
Authorization: Bearer your-token

{
  "planIds": ["plan_001", "plan_002"],
  "criteria": ["cost", "coverage", "network"]
}
```

#### Calculate Costs
```http
POST /api/v1/benefits/calculate
Content-Type: application/json
Authorization: Bearer your-token

{
  "planId": "plan_001",
  "usage": {
    "doctorVisits": 4,
    "prescriptions": 12,
    "emergencyVisits": 0
  },
  "timeframe": "annual"
}
```

### Documents API

#### Upload Document
```http
POST /api/v1/documents
Content-Type: multipart/form-data
Authorization: Bearer your-token

file: [binary data]
title: "Insurance Card"
description: "Employee insurance card"
```

**Response:**
```json
{
  "id": "doc_123456",
  "title": "Insurance Card",
  "description": "Employee insurance card",
  "filename": "insurance_card.pdf",
  "size": 245760,
  "mimeType": "application/pdf",
  "status": "processed",
  "uploadedAt": "2024-12-19T10:30:00Z",
  "processedAt": "2024-12-19T10:30:15Z"
}
```

#### Search Documents
```http
GET /api/v1/documents/search?q=insurance&type=pdf
Authorization: Bearer your-token
```

#### Get Document Content
```http
GET /api/v1/documents/{documentId}/content
Authorization: Bearer your-token
```

### Analytics API

#### Get Usage Statistics
```http
GET /api/v1/analytics/usage?startDate=2024-12-01&endDate=2024-12-31
Authorization: Bearer your-token
```

**Response:**
```json
{
  "period": {
    "startDate": "2024-12-01T00:00:00Z",
    "endDate": "2024-12-31T23:59:59Z"
  },
  "metrics": {
    "totalMessages": 1250,
    "uniqueUsers": 45,
    "averageResponseTime": 1.2,
    "satisfactionScore": 4.3,
    "costBreakdown": {
      "aiUsage": 125.50,
      "storage": 25.30,
      "apiCalls": 15.75
    }
  }
}
```

#### Get Performance Metrics
```http
GET /api/v1/analytics/performance
Authorization: Bearer your-token
```

### Admin API

#### Get Users
```http
GET /api/v1/admin/users?page=1&limit=20&role=employee
Authorization: Bearer admin-token
```

#### Create User
```http
POST /api/v1/admin/users
Content-Type: application/json
Authorization: Bearer admin-token

{
  "email": "user@company.com",
  "displayName": "John Doe",
  "role": "employee",
  "companyId": "comp_123"
}
```

#### Update User
```http
PUT /api/v1/admin/users/{userId}
Content-Type: application/json
Authorization: Bearer admin-token

{
  "displayName": "John Smith",
  "role": "admin"
}
```

#### Get System Health
```http
GET /api/v1/admin/health
Authorization: Bearer admin-token
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-12-19T10:30:00Z",
  "services": {
    "database": { "status": "up", "responseTime": 45 },
    "storage": { "status": "up", "responseTime": 120 },
    "openai": { "status": "up", "responseTime": 850 },
    "redis": { "status": "up", "responseTime": 12 }
  },
  "metrics": {
    "responseTime": 1.2,
    "errorRate": 0.001,
    "throughput": 45.5,
    "memoryUsage": 0.65,
    "cpuUsage": 0.42
  }
}
```

## Error Handling

### Error Response Format

All errors follow a consistent format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": {
      "field": "email",
      "reason": "Invalid email format"
    },
    "timestamp": "2024-12-19T10:30:00Z",
    "requestId": "req_123456"
  }
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 422 | Validation Error |
| 429 | Rate Limited |
| 500 | Internal Server Error |
| 503 | Service Unavailable |

### Error Codes

| Code | Description |
|------|-------------|
| `INVALID_TOKEN` | Invalid or expired authentication token |
| `RATE_LIMITED` | Request rate limit exceeded |
| `VALIDATION_ERROR` | Request validation failed |
| `RESOURCE_NOT_FOUND` | Requested resource not found |
| `INSUFFICIENT_PERMISSIONS` | User lacks required permissions |
| `SERVICE_UNAVAILABLE` | External service temporarily unavailable |
| `QUOTA_EXCEEDED` | API quota exceeded |

## Rate Limiting

### Limits

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| Chat API | 10 requests | 1 minute |
| Benefits API | 20 requests | 1 minute |
| Documents API | 5 requests | 1 minute |
| Admin API | 50 requests | 1 minute |

### Rate Limit Headers

```http
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1640000000
```

### Handling Rate Limits

When rate limited, the API returns a 429 status with retry information:

```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Rate limit exceeded",
    "retryAfter": 60
  }
}
```

## Webhooks

### Configuration

Configure webhooks in the admin dashboard under **Settings** → **Webhooks**.

### Event Types

- `message.created` - New message sent
- `conversation.updated` - Conversation updated
- `document.uploaded` - Document uploaded
- `user.created` - New user created
- `alert.triggered` - System alert triggered

### Webhook Payload

```json
{
  "id": "evt_123456",
  "type": "message.created",
  "timestamp": "2024-12-19T10:30:00Z",
  "data": {
    "messageId": "msg_123456",
    "conversationId": "conv_789012",
    "userId": "user_456789"
  }
}
```

### Security

Webhooks are secured using HMAC-SHA256 signatures:

```http
X-Webhook-Signature: sha256=abc123def456...
```

## SDKs and Examples

### JavaScript/Node.js

```javascript
import { BenefitsChatbotAPI } from '@benefits-chatbot/sdk';

const api = new BenefitsChatbotAPI({
  apiKey: 'your-api-key',
  baseURL: 'https://amerivetaibot.bcgenrolls.com/api/v1'
});

// Send a message
const response = await api.chat.sendMessage({
  message: 'What are my health benefits?',
  conversationId: 'conv_123'
});

console.log(response.data);
```

### Python

```python
from benefits_chatbot import BenefitsChatbotAPI

api = BenefitsChatbotAPI(
    api_key='your-api-key',
    base_url='https://amerivetaibot.bcgenrolls.com/api/v1'
)

# Send a message
response = api.chat.send_message(
    message='What are my health benefits?',
    conversation_id='conv_123'
)

print(response.data)
```

### cURL Examples

#### Send Message
```bash
curl -X POST https://amerivetaibot.bcgenrolls.com/api/v1/chat \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What are my health benefits?",
    "conversationId": "conv_123"
  }'
```

#### Upload Document
```bash
curl -X POST https://amerivetaibot.bcgenrolls.com/api/v1/documents \
  -H "Authorization: Bearer your-token" \
  -F "file=@document.pdf" \
  -F "title=Insurance Card" \
  -F "description=Employee insurance card"
```

## Testing

### Test Environment

Use the development environment for testing:

```
https://dev-amerivetaibot.bcgenrolls.com/api/v1
```

### Test Data

The test environment includes sample data:
- Test users with different roles
- Sample benefit plans
- Mock documents
- Simulated conversations

### Postman Collection

Import our Postman collection for easy API testing:

[Download Postman Collection](./postman-collection.json)

### API Testing Checklist

- [ ] Authentication works with valid tokens
- [ ] Rate limiting is enforced
- [ ] Error responses are consistent
- [ ] All endpoints return expected data
- [ ] Webhooks are delivered correctly
- [ ] File uploads work properly
- [ ] Search functionality is accurate

## Support

### Documentation
- [API Reference](./api-reference.md)
- [Integration Guide](./integration-guide.md)
- [Troubleshooting](./troubleshooting.md)

### Contact
- **Email**: api-support@company.com
- **Slack**: #api-support
- **Status Page**: https://status.benefits-chatbot.com

---

*Last updated: December 19, 2024*
*API Version: v1.0*
