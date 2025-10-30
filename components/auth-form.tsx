import React from 'react';

interface AuthFormProps {
  type: 'login' | 'register';
  onSubmit: (data: { email: string; password: string }) => Promise<void>;
  onGoogleClick: () => Promise<void>;
  loading: boolean;
}

export function AuthForm({ type, onSubmit, onGoogleClick, loading }: AuthFormProps) {
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    await onSubmit({ email, password });
  };

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="email">Email</label>
      <input 
        id="email"
        name="email"
        type="email" 
        placeholder="Email" 
        required 
        disabled={loading}
      />
      <label htmlFor="password">Password</label>
      <input 
        id="password"
        name="password"
        type="password" 
        placeholder="Password" 
        required 
        disabled={loading}
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Loading...' : type === 'login' ? 'Login' : 'Register'}
      </button>
      <button type="button" onClick={onGoogleClick} disabled={loading}>
        Continue with Google
      </button>
    </form>
  );
}