// src/context/ProfileContext.tsx

import React, { createContext, useContext, useState, ReactNode } from "react";
import { useRouter } from "next/router";
import { useAuth } from "./AuthContext";
import { User } from "../types/user.types";

interface ProfileContextType {
  isLoggedIn: boolean;
  isLoadingAuth: boolean;
  user: User | null;
  login: () => void;
  logout: () => void;
}

const ProfileContext = createContext<ProfileContextType | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user, logout: authLogout, isLoading: authIsLoading } = useAuth();
  const router = useRouter();

  const isLoggedIn = !!user;

  // ✅ No duplicate normalization — AuthContext already normalizes the user.
  // ProfileContext simply passes the already-normalized user through.

  const login = () => {
    // Redirect to login, preserving the current path for post-login redirect
    const currentPath = router.asPath;
    router.push(`/login?redirect=${encodeURIComponent(currentPath)}`);
  };

  const logout = () => {
    authLogout().finally(() => {
      // ✅ Use Next.js router instead of window.location.href to keep SPA state
      router.push("/login");
    });
  };

  return (
    <ProfileContext.Provider
      value={{
        isLoggedIn,
        isLoadingAuth: authIsLoading,
        user,
        login,
        logout,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used within ProfileProvider");
  return ctx;
}
