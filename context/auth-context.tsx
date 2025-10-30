// context/auth-context.tsx
'use client';

import { createContext, useEffect, useState, type ReactNode, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { getMsalInstance, loginRequest } from '@/lib/azure/msal-client';
import { useMsal } from '@azure/msal-react';
import { InteractionStatus } from '@azure/msal-browser';

interface AuthContextType {
  account: any | null;
  loading: boolean;
  isSigningIn: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { instance, accounts, inProgress } = useMsal();
  const [account, setAccount] = useState<any | null>(null);
  const router = useRouter();

  // Test mode: provide mock account for Playwright tests
  useEffect(() => {
    if (process.env.NODE_ENV === 'test' || process.env.NEXT_PUBLIC_TEST_MODE === 'true') {
      setAccount({ 
        username: 'test@example.com', 
        name: 'Test User',
        localAccountId: 'test-user-id'
      });
      return;
    }

    if (accounts.length > 0) {
      setAccount(accounts[0]);
    }
  }, [accounts]);

  const login = async () => {
    try {
      // Demo mode: bypass authentication for demonstration
      if (process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_AZURE_AD_CLIENT_ID) {
        console.log('Demo mode: Bypassing authentication');
        setAccount({
          username: 'demo@amerivet.com',
          name: 'Demo User',
          localAccountId: 'demo-account-id',
          homeAccountId: 'demo-home-account-id',
          environment: 'demo',
          tenantId: 'demo-tenant-id',
          idTokenClaims: {
            name: 'Demo User',
            email: 'demo@amerivet.com',
            preferred_username: 'demo@amerivet.com'
          }
        });
        router.push('/');
        return;
      }
      
      await instance.loginRedirect(loginRequest);
    } catch (e) {
      console.error('Login error:', e);
      // Fallback to demo mode if authentication fails
      if (process.env.NODE_ENV === 'development') {
        console.log('Authentication failed, falling back to demo mode');
        setAccount({
          username: 'demo@amerivet.com',
          name: 'Demo User',
          localAccountId: 'demo-account-id',
          homeAccountId: 'demo-home-account-id',
          environment: 'demo',
          tenantId: 'demo-tenant-id',
          idTokenClaims: {
            name: 'Demo User',
            email: 'demo@amerivet.com',
            preferred_username: 'demo@amerivet.com'
          }
        });
        router.push('/');
      }
    }
  };

  const logout = async () => {
    try {
      await instance.logoutRedirect({
        postLogoutRedirectUri: '/',
      });
    } catch (e) {
      console.error(e);
    }
  };
  
  const loading = inProgress !== InteractionStatus.None;

  return (
    <AuthContext.Provider
      value={{ account, loading, isSigningIn: loading, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
