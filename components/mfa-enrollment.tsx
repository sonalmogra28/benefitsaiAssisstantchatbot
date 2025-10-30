// components/mfa-enrollment.tsx
'use client';

import { useAuth } from '@/context/auth-context';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useState } from 'react';
// MFA enrollment - to be implemented with Azure AD B2C

export function MfaEnrollment() {
  const { account: user } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleEnroll = async () => {
    try {
      // TODO: Implement Azure AD B2C MFA enrollment
      setError('MFA enrollment not yet implemented with Azure AD B2C');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
      setSuccess(null);
    }
  };

  const handleVerify = async () => {
    try {
      // TODO: Implement Azure AD B2C MFA verification
      setError('MFA verification not yet implemented with Azure AD B2C');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
      setSuccess(null);
    }
  };

  return (
    <div className="space-y-4">
      <div id="recaptcha-container" />
      <div>
        <Input
          type="tel"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          placeholder="Enter phone number (e.g., +16505551234)"
        />
        <Button onClick={handleEnroll} className="mt-2">
          Send Verification Code
        </Button>
      </div>

      {verificationId && (
        <div>
          <Input
            type="text"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
            placeholder="Enter verification code"
          />
          <Button onClick={handleVerify} className="mt-2">
            Verify and Enroll
          </Button>
        </div>
      )}

      {error && <p className="text-red-500">{error}</p>}
      {success && <p className="text-green-500">{success}</p>}
    </div>
  );
}
