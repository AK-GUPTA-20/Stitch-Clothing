import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthResponse } from '../types/user.types';
import { userService } from '../api/userService';
import { tokenStore } from '../api/apiClient';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
}

function normalizeUser(user: User): User {
  return {
    ...user,
    name: user.name || user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
    emailVerified: user.emailVerified ?? false,
    phoneVerified: user.phoneVerified ?? false,
    isActive: user.isActive ?? true,
    isSuspended: user.isSuspended ?? false,
    walletBalance: user.walletBalance ?? 0,
    loyaltyPoints: user.loyaltyPoints ?? 0,
    loyaltyTier: user.loyaltyTier ?? 'bronze',
    unreadNotifCount: user.unreadNotifCount ?? 0,
    preferredLanguage: user.preferredLanguage ?? 'en',
    preferredCurrency: user.preferredCurrency ?? 'INR',
    orderCount: user.orderCount ?? 0,
  };
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (data: LoginPayload) => Promise<AuthResponse>;
  register: (data: RegisterPayload) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const res = await userService.getProfile();
      if (res.success) {
        setUser(normalizeUser(res.user));
      }
    } catch (error) {
      console.error('Failed to refresh user profile:', error);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const token = tokenStore.getAccess();
      if (token) {
        try {
          const res = await userService.getProfile();
          if (res.success) {
            setUser(normalizeUser(res.user));
          }
        } catch (error: any) {
          console.error('Failed to restore session:', error);
          // Token is likely invalid or expired (and refresh failed).
          if (error?.status === 401 || error?.status === 403) {
            tokenStore.clear();
          }
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (data: LoginPayload) => {
    const res = await userService.login(data);
    if (res.success) {
      tokenStore.setAccess(res.accessToken);
      tokenStore.setRefresh(res.refreshToken);
      setUser(normalizeUser(res.user));
    }
    return res;
  };

  const register = async (data: RegisterPayload) => {
    const res = await userService.register(data);
    if (res.success) {
      tokenStore.setAccess(res.accessToken);
      tokenStore.setRefresh(res.refreshToken);
      setUser(normalizeUser(res.user));
    }
    return res;
  };

  const logout = async () => {
    try {
      const refreshToken = tokenStore.getRefresh();
      if (refreshToken) {
        await userService.logout(refreshToken);
      }
    } catch (e) {
      console.error(e);
    } finally {
      tokenStore.clear();
      setUser(null);
    }
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, updateUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

