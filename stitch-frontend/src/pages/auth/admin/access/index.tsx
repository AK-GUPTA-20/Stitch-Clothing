'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/context/AuthContext';
import Head from 'next/head';
import { Shield } from 'lucide-react';

export default function AdminAccessPage() {
  const router = useRouter();
  const { login } = useAuth();
  
  const [email, setEmail] = useState('@gmail.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await login({ email, password });
      if (res.success && res.user?.role === 'admin') {
        router.push('/admin');
      } else if (res.success) {
        setError('Access denied: User is not an admin.');
      } else {
        const errorMsg = res.message || 'Authentication failed';
        if (errorMsg.toLowerCase().includes('credential') || errorMsg.toLowerCase().includes('not found')) {
          setError(`${errorMsg} (Hint: If this is a new setup, ensure you run 'npm run seed:admin' on the backend.)`);
        } else {
          setError(errorMsg);
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-950 text-stone-100 font-sans">
      <Head>
        <title>Admin Access | STITCH</title>
      </Head>
      
      <div className="w-full max-w-sm p-8 bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl animate-fade-up">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-stone-800 rounded-full flex items-center justify-center mb-4 text-stone-300">
            <Shield size={24} />
          </div>
          <h1 className="font-display text-2xl tracking-widest uppercase font-light text-white">System Access</h1>
          <p className="text-[10px] tracking-[0.2em] uppercase text-stone-500 mt-2">Authorized Personnel Only</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-950/50 border border-red-900 rounded-lg text-xs text-red-400 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] tracking-[0.2em] uppercase text-stone-500 mb-1.5 ml-1">Identifier</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-stone-950 border border-stone-800 px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-stone-600 transition-colors"
              required
            />
          </div>
          
          <div>
            <label className="block text-[10px] tracking-[0.2em] uppercase text-stone-500 mb-1.5 ml-1">Passcode</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-stone-950 border border-stone-800 px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-stone-600 transition-colors"
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full mt-4 bg-white text-stone-950 py-3.5 rounded-xl text-[11px] font-bold tracking-[0.2em] uppercase hover:bg-stone-200 transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Verifying...' : 'Authenticate'}
          </button>
        </form>
      </div>
    </div>
  );
}
