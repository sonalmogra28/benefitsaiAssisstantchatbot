import { type NextRequest, NextResponse } from 'next/server';
import { requireCompanyAdmin } from '@/lib/auth/unified-auth';
import { getContainer } from '@/lib/azure/cosmos-db';
import { userService } from '@/lib/services/user-service';

export const GET = requireCompanyAdmin(async (request: NextRequest) => {
  const userId = request.headers.get('X-User-Id');

  if (!userId) {
    return NextResponse.json({ error: 'No user ID provided' }, { status: 400 });
  }

  const existingUser = await userService.getUserById(userId);

  if (!existingUser) {
    return NextResponse.json({ exists: false }, { status: 404 });
  }

  return NextResponse.json({ exists: true, user: existingUser });
});
