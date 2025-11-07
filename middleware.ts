// Middleware for API auth guarding admin endpoints.
// Tests import a named `middleware` function and expect 307 redirects
// for missing/insufficient auth. Provide minimal logic while keeping
// production surface small. Extend matcher only for admin API paths.
import { NextRequest, NextResponse } from 'next/server';

export const config = { matcher: ['/api/admin/:path*'] };

export function middleware(req: NextRequest) {
	try {
		const auth = req.headers.get('authorization');
		const role = req.headers.get('x-user-role');

		// Block if missing Authorization header or role not elevated.
		if (!auth || !role || !['admin','super_admin','platform_admin','company_admin','hr_admin'].includes(role.toLowerCase())) {
			// Use 307 (temporary redirect) per test expectation.
			const url = req.nextUrl.clone();
			url.pathname = '/subdomain/auth';
			return NextResponse.redirect(url, 307);
		}

		// Allow request to continue (no modification) when authorized.
		return NextResponse.next();
	} catch {
		// On unexpected error, fail closed with redirect.
		const url = req.nextUrl.clone();
		url.pathname = '/subdomain/auth';
		return NextResponse.redirect(url, 307);
	}
}

// Retain default export for Next.js compatibility (not used in tests)
export default middleware;
