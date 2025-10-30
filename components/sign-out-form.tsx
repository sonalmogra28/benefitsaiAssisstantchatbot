'use client';

// Sign out - to be implemented with Azure AD B2C
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { logError } from '@/lib/logger';

export const SignOutForm = () => {
  const { logout } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      logError('Error signing out:', error);
    }
  };

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="w-full text-left px-1 py-0.5 text-red-500"
    >
      Sign out
    </button>
  );
};
