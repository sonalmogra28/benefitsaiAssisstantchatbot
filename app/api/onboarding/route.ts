import { type NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/unified-auth';
import { USER_ROLES } from '@/lib/constants/roles';
import { onboardingService } from '@/lib/services/onboarding.service';
import { logger, logError } from '@/lib/logger';

export const POST = withAuth(USER_ROLES.EMPLOYEE)(
  async (request: NextRequest) => {
    try {
      // Extract user information from headers
      const userId = request.headers.get('x-user-id')!;
      
      // Parse request body
      const data = await request.json();

      // Complete onboarding
      await onboardingService.completeOnboarding(userId, data);

      return NextResponse.json({
        success: true,
        message: 'Onboarding completed successfully',
      });
    } catch (error) {
      logError('Onboarding error:', error);
      return NextResponse.json(
        { error: 'Failed to complete onboarding' },
        { status: 500 },
      );
    }
  },
);

export const GET = withAuth(USER_ROLES.EMPLOYEE)(
  async (request: NextRequest) => {
    try {
      // Extract user information from headers
      const userId = request.headers.get('x-user-id')!;
      
      // Get onboarding status
      const status = await onboardingService.getOnboardingStatus(userId);

      return NextResponse.json(status);
    } catch (error) {
      logError('Get onboarding status error:', error);
      return NextResponse.json(
        { error: 'Failed to get onboarding status' },
        { status: 500 },
      );
    }
  },
);

export const PATCH = withAuth(USER_ROLES.EMPLOYEE)(
  async (request: NextRequest) => {
    try {
      // Extract user information from headers
      const userId = request.headers.get('x-user-id')!;
      
      // Parse request body
      const { step, data } = await request.json();

      // Update onboarding progress
      await onboardingService.updateOnboardingProgress(userId, step, data);

      return NextResponse.json({
        success: true,
        message: 'Onboarding progress updated',
      });
    } catch (error) {
      logError('Update onboarding progress error:', error);
      return NextResponse.json(
        { error: 'Failed to update onboarding progress' },
        { status: 500 },
      );
    }
  },
);
