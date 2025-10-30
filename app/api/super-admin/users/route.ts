// app/api/super-admin/users/route.ts
import { NextResponse } from 'next/server';
import { getContainer } from '@/lib/azure/cosmos-db';
import { emailService } from '@/lib/services/email.service';
import { requireSuperAdmin } from '@/lib/auth/unified-auth';
import { userService } from '@/lib/services/user-service';
import { z } from 'zod';

// Input validation schema
const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  role: z.enum([
    'employee',
    'hr-admin',
    'company-admin',
    'platform-admin',
    'super-admin',
  ]),
  companyId: z.string().optional(),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
});

export const POST = requireSuperAdmin(async (request: Request) => {
  try {
    // Authentication handled by requireSuperAdmin middleware

    // Parse and validate request body
    const body = await request.json();
    const validationResult = createUserSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { email, password, role, companyId, firstName, lastName } =
      validationResult.data;

    // Check if user already exists
    // TODO: Implement user existence check with Azure Cosmos DB
    const existingUser = null; // Placeholder
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 },
      );
    }

    // Create user in Azure Cosmos DB
    // TODO: Implement user creation with Azure Cosmos DB
    const userRecord = {
      uid: 'placeholder-id',
      email,
      displayName: `${firstName} ${lastName}`,
      emailVerified: false,
    };

    // Set custom claims for role-based access
    // TODO: Implement custom claims with Azure AD B2C
    const customClaims = {
      role,
      companyId: companyId || null,
      createdBy: 'placeholder-admin-id',
      createdAt: new Date().toISOString(),
    };

    // Create user document in Azure Cosmos DB
    const usersContainer = await getContainer('users');
    await usersContainer.items.create({
      id: userRecord.uid,
      email,
      role,
      companyId: companyId || null,
      firstName,
      lastName,
      displayName: `${firstName} ${lastName}`,
      status: 'active',
      createdBy: 'placeholder-admin-id',
      createdByEmail: 'admin@placeholder.com',
      createdAt: new Date().toISOString(),
      lastModifiedAt: new Date().toISOString(),
      emailVerified: false,
      profileComplete: false,
      partitionKey: userRecord.uid
    });

    // Log the user creation for audit
    const auditContainer = await getContainer('audit_logs');
    await auditContainer.items.create({
      id: `audit-${Date.now()}`,
      action: 'user_created',
      targetUserId: userRecord.uid,
      targetEmail: email,
      targetRole: role,
      performedBy: 'placeholder-admin-id',
      performedByEmail: 'admin@placeholder.com',
      performedByRole: 'super_admin',
      timestamp: new Date().toISOString(),
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      partitionKey: userRecord.uid
    });

    // Send verification email
    // TODO: Implement email verification with Azure Communication Services
    const verificationLink = `https://placeholder.com/verify?token=placeholder-token`;

    // Send welcome email via email service
    try {
      await emailService.sendWelcomeEmail(
        email,
        `${firstName} ${lastName}`,
        'Benefits Assistant'
      );
    } catch (emailError) {
      // Log email error but don't fail user creation
      console.error('Failed to send welcome email:', emailError);
    }

    return NextResponse.json(
      {
        uid: userRecord.uid,
        email: userRecord.email,
        message: 'User created successfully. Verification email queued.',
      },
      { status: 201 },
    );
  } catch (error) {
    // Log error securely
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    // Log error to Azure Cosmos DB
    const errorContainer = await getContainer('error_logs');
    await errorContainer.items.create({
      id: `error-${Date.now()}`,
      endpoint: '/api/super-admin/users',
      method: 'POST',
      error: errorMessage,
      timestamp: new Date().toISOString(),
      partitionKey: 'error-logs'
    });

    return NextResponse.json(
      { error: 'Failed to create user. Please try again.' },
      { status: 500 },
    );
  }
});

export const GET = requireSuperAdmin(async (request: Request) => {
  try {
    // Authentication handled by requireSuperAdmin middleware
    const users = await userService.listUsers({ companyId: '', limit: 100, offset: 0 });
    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error listing users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 },
    );
  }
});
