<<<<<<< HEAD
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { SharedPasswordAuth } from '@/lib/auth/shared-password-auth'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Handle subdomain routes
  if (pathname.startsWith('/subdomain/')) {
    // Allow login page without authentication
    if (pathname === '/subdomain/login') {
      return NextResponse.next()
    }

    // Check authentication for other subdomain routes
    const authResult = await SharedPasswordAuth.validateSession(req)
    
    if (!authResult.isAuthenticated) {
      // Redirect to login if not authenticated
      const loginUrl = new URL('/subdomain/login', req.url)
      return NextResponse.redirect(loginUrl)
    }

    // Add user info to headers for subdomain routes
    if (authResult.user) {
      const response = NextResponse.next()
      response.headers.set('x-user-id', authResult.user.id)
      response.headers.set('x-user-email', authResult.user.email)
      response.headers.set('x-user-name', authResult.user.name)
      response.headers.set('x-company-id', authResult.user.companyId)
      response.headers.set('x-user-roles', authResult.user.roles.join(','))
      response.headers.set('x-user-permissions', authResult.user.permissions.join(','))
      response.headers.set('x-auth-method', 'shared-password')
      return response
    }
  }

  // Handle API routes with rate limiting
  if (pathname.startsWith('/api/')) {
    // Apply rate limiting based on the API endpoint
    const rateLimitResponse = await applyRateLimiting(req, pathname)
    if (rateLimitResponse) {
      return rateLimitResponse
    }
  }

  // For other routes, rely on route-level authentication
  return NextResponse.next()
}

async function applyRateLimiting(req: NextRequest, pathname: string): Promise<NextResponse | null> {
  try {
    // Import rate limiters dynamically to avoid circular dependencies
    const { rateLimiters } = await import('@/lib/middleware/rate-limit')
    
    // Determine rate limiter based on endpoint
    let rateLimiter
    if (pathname.includes('/auth/') || pathname.includes('/login')) {
      rateLimiter = rateLimiters.auth
    } else if (pathname.includes('/chat')) {
      rateLimiter = rateLimiters.chat
    } else if (pathname.includes('/upload')) {
      rateLimiter = rateLimiters.upload
    } else if (pathname.includes('/admin/')) {
      rateLimiter = rateLimiters.admin
    } else {
      rateLimiter = rateLimiters.api
    }

    return await rateLimiter(req)
  } catch (error) {
    console.error('Rate limiting error:', error)
    return null // Allow request on error
  }
=======
// Import polyfills first to ensure they're available
import '@/lib/polyfills/global-polyfills';

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Simple middleware for MVP - no complex dependencies
  console.log(`Middleware: ${req.method} ${pathname}`)

  // Add basic security headers
  const response = NextResponse.next()
  
  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  
  return response
>>>>>>> main
}

export const config = {
  matcher: [
    '/api/:path*', 
    '/admin/:path*',
    '/subdomain/:path*'
  ]
}