import { NextRequest, NextResponse } from 'next/server';
import { withCompanyAdminAuth } from '@/lib/auth/unified-auth';
import { userService } from '@/lib/services/user-service';
import { userMetadataSchema } from '@/lib/schemas/user';
import { logger, logError } from '@/lib/logger';

export const GET = withCompanyAdminAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('id');

    if (!employeeId) {
      return NextResponse.json({ error: 'Employee ID required' }, { status: 400 });
    }

    const employee = await userService.getUserById(employeeId);
    
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Extract user info from headers (set by withCompanyAdminAuth middleware)
    const userCompanyId = request.headers.get('x-company-id');
    
    // Ensure user can only access employees from their company
    if (employee.companyId !== userCompanyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json({ employee });
  } catch (error) {
    logError('Error fetching employee', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

export const PUT = withCompanyAdminAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('id');
    const body = await request.json();

    if (!employeeId) {
      return NextResponse.json({ error: 'Employee ID required' }, { status: 400 });
    }

    // Validate request body
    const validatedData = userMetadataSchema.parse(body);

    const updatedEmployee = await userService.updateUser(employeeId, validatedData);

    return NextResponse.json({ employee: updatedEmployee });
  } catch (error) {
    logError('Error updating employee', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

export const DELETE = withCompanyAdminAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('id');

    if (!employeeId) {
      return NextResponse.json({ error: 'Employee ID required' }, { status: 400 });
    }

    // Check if employee exists and belongs to the same company
    const employee = await userService.getUserById(employeeId);
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Extract user info from headers (set by withCompanyAdminAuth middleware)
    const userCompanyId = request.headers.get('x-company-id');
    
    if (employee.companyId !== userCompanyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await userService.deleteUser(employeeId);

    return NextResponse.json({ success: true });
  } catch (error) {
    logError('Error deleting employee', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});