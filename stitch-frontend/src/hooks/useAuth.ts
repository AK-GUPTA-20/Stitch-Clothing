import { useAuthContext } from '@/context/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';

export const useAuth = () => {
  const { user, loading } = useAuthContext();

  const logout = async () => {
    try {
      await signOut(auth);
      // Optional: Clear backend session if applicable
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error', error);
    }
  };

  return { user, loading, logout };
};
