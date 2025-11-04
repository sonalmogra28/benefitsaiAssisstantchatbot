# Security Invariants

This document outlines critical security patterns that **MUST** be maintained across the codebase to prevent regression of previously-fixed vulnerabilities.

## Authentication System

### Route Handler Pattern (API Routes)

**All API routes MUST follow this pattern to prevent JSON parse errors:**

```typescript
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Helper: always return JSON with correct content-type
function json(status: number, body: Record<string, unknown>, extra?: HeadersInit) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...(extra ?? {}) },
  });
}

// OPTIONS for CORS preflight
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

// GET explicitly rejected (never return empty body)
export async function GET() {
  return json(405, { ok: false, error: 'METHOD_NOT_ALLOWED' });
}

// POST handler
export async function POST(req: Request) {
  try {
    // ... handler logic
    return json(200, { ok: true, data: '...' });
  } catch (e) {
    return json(500, { ok: false, error: 'INTERNAL_ERROR' });
  }
}
```

**Critical invariants:**
- ✅ **Always return JSON** - Never return empty bodies, never return HTML on error
- ✅ **Use raw `Response` API** - Not `NextResponse` (prevents content-type issues)
- ✅ **Explicit HTTP method handlers** - OPTIONS, GET, POST exported separately
- ✅ **Local `json()` helper** - Guarantees content-type on every response
- ❌ **Never use 204 No Content** - Always return JSON body with status

### Environment Variable Handling

**Environment variables containing passwords MUST be sanitized:**

```typescript
// CORRECT: trim() removes \r\n from Vercel web UI, NFKC prevents Unicode attacks
const password = (process.env.PASSWORD ?? '').trim().normalize('NFKC');
```

**Why:**
- Vercel web UI can embed `\r\n` line endings when setting env vars via browser
- Unicode normalization NFKC prevents lookalike character attacks (e.g., `раssword` with Cyrillic 'а')

**Unit test coverage:**
- `tests/unit/auth-login-newline.test.ts` - Guards against newline regression
- Must test: `PASSWORD="value\r\n"` still authenticates with `"value"`

### Timing-Safe Password Comparison

**All password comparisons MUST use `crypto.timingSafeEqual`:**

```typescript
const safeEq = async (a: string, b: string) => {
  const A = Buffer.from(a.normalize('NFKC')); 
  const B = Buffer.from(b.normalize('NFKC'));
  if (A.length !== B.length) return false;
  const crypto = await import('crypto');
  return crypto.timingSafeEqual(A, B);
};
```

**Why:**
- Prevents timing attacks where attacker measures response time to guess password characters
- Both inputs MUST be normalized before comparison

### Cookie Security

**Session cookies MUST include all security flags:**

```typescript
const cookie = [
  'amerivet_session=<role>',
  'Path=/',
  'HttpOnly',      // Prevents XSS access to cookie
  'Secure',        // HTTPS only
  'SameSite=Lax',  // CSRF protection
  'Max-Age=1800',  // 30 minutes
].join('; ');
```

**Critical flags:**
- ✅ `HttpOnly` - JavaScript cannot read cookie (XSS mitigation)
- ✅ `Secure` - Only sent over HTTPS (MitM mitigation)
- ✅ `SameSite=Lax` - Prevents CSRF attacks
- ✅ `Max-Age` - Explicit expiration (not session-only)
- ⚠️ `Domain` - **Only set if multi-subdomain sharing needed** (e.g., `Domain=.bcgenrolls.com`)

**Logout pattern:**

```typescript
// Expire cookie immediately with Max-Age=0
const cookie = [
  'amerivet_session=deleted',
  'Path=/',
  'HttpOnly',
  'Secure',
  'SameSite=Lax',
  'Max-Age=0', // Expire now
].join('; ');
```

### Rate Limiting

**Login endpoints MUST implement rate limiting:**

```typescript
import { checkRateLimit } from '@/lib/auth/rate-limiter';

// In POST handler:
const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
const ua = req.headers.get('user-agent') || 'unknown';
const identifier = `${ip}:${ua.slice(0, 50)}`;

const rateLimit = checkRateLimit(identifier);
if (!rateLimit.allowed) {
  return json(429, { 
    ok: false, 
    error: 'TOO_MANY_ATTEMPTS',
    message: 'Too many login attempts. Please try again in 15 minutes.'
  }, {
    'Retry-After': '900',
  });
}
```

**Current limits:**
- 5 attempts per IP+UA per 15 minutes
- In-memory store (resets on redeploy)
- **Production TODO:** Migrate to Redis/Upstash for distributed state

## Client-Side Patterns

### Safe API Calls

**Never blindly call `.json()` on responses - use safe parsing:**

```typescript
// CORRECT: Centralized api() helper
async function api(url: string, options: RequestInit) {
  const res = await fetch(url, options);
  const text = await res.text();
  
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Invalid JSON response: ${text.slice(0, 100)}`);
  }
  
  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  
  return data;
}
```

**Why:**
- Old pattern: `res.json()` crashes on empty/HTML responses
- New pattern: `.text()` then guarded `JSON.parse()` with error message

### Cookie Header Access

**Never index Set-Cookie headers - use `.get()` method:**

```typescript
// WRONG: res.headers['set-cookie'][0] - crashes if undefined
// CORRECT:
const cookie = res.headers.get('set-cookie');
```

### Form Submission

**Always prevent default and use explicit POST:**

```typescript
const onSubmit = async (e: FormEvent) => {
  e.preventDefault(); // Critical: prevent browser form submission
  
  const form = e.currentTarget as HTMLFormElement;
  const password = form.get('password') as string;
  
  const data = await api('/api/subdomain/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
};
```

## Build-Time Safety

### Azure SDK Imports

**Never import Azure SDKs at module top-level - use lazy initialization:**

```typescript
import { isBuild } from '@/lib/runtime/is-build';

// WRONG: Crashes Next.js build
import { CosmosClient } from '@azure/cosmos';
const client = new CosmosClient({ ... });

// CORRECT: Lazy init in function
export async function getClient() {
  if (isBuild()) return null;
  const { CosmosClient } = await import('@azure/cosmos');
  return new CosmosClient({ ... });
}
```

## DNS & Domain Configuration

**Custom subdomain configuration:**

1. ✅ **CNAME only** - `amerivetaibot.bcgenrolls.com` → `cname.vercel-dns.com`
2. ❌ **No A record alongside CNAME** - DNS spec violation
3. ✅ **SSL auto-provisioned** - Vercel handles Let's Encrypt
4. ✅ **Cert renewal** - Automatic when `renew=yes` in cert list

## Regression Tests

### Required Unit Tests

1. **Newline handling** (`tests/unit/auth-login-newline.test.ts`)
   - Test: `PASSWORD="value\r\n"` still authenticates
   - Guards: Vercel env var UI bug

2. **JSON response format** (TODO)
   - Test: All API routes return JSON on error
   - Guards: Empty body / HTML response regression

3. **Rate limiting** (TODO)
   - Test: 6th attempt returns 429
   - Guards: Brute force attacks

### Smoke Tests (Production)

**Must pass after every deployment:**

```powershell
# Employee login
$r = iwr 'https://amerivetaibot.bcgenrolls.com/api/subdomain/auth/login' `
  -Method POST -Headers @{ 'Content-Type'='application/json' } `
  -Body '{"password":"<EMPLOYEE_PWD>"}' -SessionVariable S
$r.StatusCode # Expected: 200
$S.Cookies.GetCookies('https://amerivetaibot.bcgenrolls.com')['amerivet_session'] # Expected: employee

# Admin login
$r = iwr 'https://amerivetaibot.bcgenrolls.com/api/subdomain/auth/login' `
  -Method POST -Headers @{ 'Content-Type'='application/json' } `
  -Body '{"password":"<ADMIN_PWD>"}' -SessionVariable S
$r.StatusCode # Expected: 200
$S.Cookies.GetCookies('https://amerivetaibot.bcgenrolls.com')['amerivet_session'] # Expected: admin

# OPTIONS preflight
iwr 'https://amerivetaibot.bcgenrolls.com/api/subdomain/auth/login' `
  -Method OPTIONS | Select-Object StatusCode,Headers
# Expected: 204 with Access-Control-Allow-Methods

# Session check
iwr 'https://amerivetaibot.bcgenrolls.com/api/subdomain/auth/session' `
  -WebSession $S
# Expected: 200 with role/permissions JSON
```

## Code Review Checklist

When reviewing PRs touching authentication:

- [ ] New API routes use `json()` helper (never empty bodies)
- [ ] Env vars use `.trim().normalize('NFKC')`
- [ ] Password comparisons use `crypto.timingSafeEqual`
- [ ] Cookies include `HttpOnly; Secure; SameSite=Lax; Max-Age`
- [ ] Client code uses `res.text()` then `JSON.parse()` (no bare `.json()`)
- [ ] No header indexing (`res.headers.get()` instead of `[0]`)
- [ ] Rate limiting applied to login endpoints
- [ ] Unit tests cover newline/Unicode edge cases

## Security Contacts

**Report vulnerabilities:**
- Internal: Create issue with `security` label (private repo)
- External: Email security@[domain] (if public)

**Rotation schedule:**
- Demo passwords: Rotate after UAT completion
- Prod passwords: Rotate quarterly or on suspected compromise
- SSL certs: Auto-renewed by Vercel (check `vercel certs ls`)

## Version History

| Date | Change | Reason |
|------|--------|--------|
| 2025-11-04 | Added `.trim()` to env var handling | Vercel UI added `\r\n` to passwords |
| 2025-11-04 | Upgraded `.normalize()` to `.normalize('NFKC')` | Unicode lookalike attack prevention |
| 2025-11-04 | Added rate limiting (5/15min) | Brute force mitigation |
| 2025-11-04 | Created logout endpoint | Session termination requirement |
