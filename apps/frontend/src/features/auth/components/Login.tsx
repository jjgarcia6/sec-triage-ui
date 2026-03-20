import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithPopup, googleProvider, signInWithEmailAndPassword, auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '../contexts/AuthContext';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (currentUser) {
      navigate('/');
    }
  }, [currentUser, navigate]);

  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6 rounded-lg border border-border bg-card p-8 shadow-sm">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-foreground">Sec Triage</h2>
          <p className="mt-2 text-sm text-muted-foreground">Sign in to access your dashboard</p>
        </div>
        
        {error && <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
        
        <form onSubmit={handleEmailSignIn} className="space-y-5">
          <div>
            <Label htmlFor="email" className="block">Email Address</Label>
            <Input
              id="email"
              name="email"
              type="email" 
              required
              autoComplete="email"
              className="mt-1"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="password" className="block">Password</Label>
            <Input
              id="password"
              name="password"
              type="password" 
              required
              autoComplete="current-password"
              className="mt-1"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button
            type="submit" 
            className="w-full"
          >
            Sign In with Email
          </Button>
        </form>

        <div className="flex items-center justify-between mt-6">
          <div className="w-full border-t border-border"></div>
          <span className="px-2 text-sm uppercase text-muted-foreground">Or continue with</span>
          <div className="w-full border-t border-border"></div>
        </div>

        <Button
          onClick={handleGoogleSignIn} 
          variant="outline"
          className="mt-6 w-full"
        >
          Google
        </Button>
      </div>
    </div>
  );
};
