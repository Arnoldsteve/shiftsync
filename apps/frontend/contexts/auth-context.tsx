'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { createAbility, AppAbility } from '@/lib/ability';
import { createContextualCan } from '@casl/react';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  managerLocationIds?: string[];
}

interface AuthContextType {
  user: User | null;
  ability: AppAbility | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Create Can component for permission checks
export const Can = createContextualCan(AuthContext.Consumer as any);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [ability, setAbility] = useState<AppAbility | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Custom setUser that also updates ability
  const setUser = (userData: User | null) => {
    setUserState(userData);
    if (userData) {
      setAbility(createAbility(userData.role, userData.managerLocationIds));
    } else {
      setAbility(null);
    }
  };

  useEffect(() => {
    // Check for stored user on mount
    const storedUser = localStorage.getItem('auth_user');
    const storedToken = localStorage.getItem('auth_token');

    if (storedUser && storedToken) {
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
      } catch (error) {
        console.error('Failed to parse stored user:', error);
        localStorage.removeItem('auth_user');
        localStorage.removeItem('auth_token');
      }
    }

    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await apiClient.post<{ token: string; user: User }>('/auth/login', {
        email,
        password,
      });

      const { token, user: userData } = response.data;

      // Store token and user
      localStorage.setItem('auth_token', token);
      localStorage.setItem('auth_user', JSON.stringify(userData));

      setUser(userData);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Login failed';
      toast.error(message);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setUser(null);
    toast.success('Logged out successfully');
  };

  const value: AuthContextType = {
    user,
    ability,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
