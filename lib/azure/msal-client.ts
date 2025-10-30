import { PublicClientApplication, Configuration, LogLevel } from '@azure/msal-browser';
import { logger } from '@/lib/logger';

const MSAL_CONFIG: Configuration = {
  auth: {
    clientId: process.env.NEXT_PUBLIC_AZURE_AD_CLIENT_ID || 'demo-client-id',
    authority: process.env.NEXT_PUBLIC_AZURE_AD_AUTHORITY || 'https://login.microsoftonline.com/common',
    knownAuthorities: process.env.NEXT_PUBLIC_AZURE_AD_KNOWN_AUTHORITIES?.split(',') || ['login.microsoftonline.com'],
    redirectUri: typeof window !== 'undefined' ? window.location.origin : '/',
    postLogoutRedirectUri: typeof window !== 'undefined' ? window.location.origin : '/',
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) {
          return;
        }
        switch (level) {
          case LogLevel.Error:
            logger.error(message);
            return;
          case LogLevel.Info:
            console.info(message);
            return;
          case LogLevel.Verbose:
            console.debug(message);
            return;
          case LogLevel.Warning:
            logger.warn(message);
            return;
        }
      },
    },
  },
};

// Lazy initialization to avoid server-side rendering issues
let msalInstance: PublicClientApplication | null = null;

export const getMsalInstance = (): PublicClientApplication => {
  if (typeof window === 'undefined') {
    throw new Error('MSAL can only be used in the browser');
  }
  
  if (!msalInstance) {
    msalInstance = new PublicClientApplication(MSAL_CONFIG);
  }
  
  return msalInstance;
};

export const loginRequest = {
  scopes: ['openid', 'offline_access'],
};
