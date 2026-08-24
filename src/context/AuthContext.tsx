import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { getStoredToken, getStoredUser, setStoredAuth, clearStoredAuth, api, mockDb } from '../api/client';
import { SEED_USER } from '../api/seedData';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isGuest: boolean;
  login: (email: string, password?: string) => Promise<void>;
  signup: (email: string, password?: string, name?: string, studioName?: string) => Promise<void>;
  loginWithGoogle: (email?: string, name?: string) => Promise<void>;
  enterGuestMode: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const savedToken = getStoredToken();
    const savedUser = getStoredUser();

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(savedUser);
      mockDb.loadUser(savedUser.id);
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password?: string) => {
    setIsLoading(true);
    try {
      const response = await api.auth.login({ email, password });
      setToken(response.token);
      setUser(response.user);
      setStoredAuth(response.token, response.user);
      mockDb.loadUser(response.user.id);
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (
    email: string,
    password?: string,
    name: string = 'Studio Owner',
    studioName: string = 'Ergon Design Studio'
  ) => {
    setIsLoading(true);
    try {
      const response = await api.auth.signup({ email, password, name, studioName });
      setToken(response.token);
      setUser(response.user);
      setStoredAuth(response.token, response.user);
      mockDb.loadUser(response.user.id, true); // true = brand new account, empty data
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async (email?: string, name?: string) => {
    setIsLoading(true);
    try {
      const response = await api.auth.googleLogin({ email, name });
      setToken(response.token);
      setUser(response.user);
      setStoredAuth(response.token, response.user);
      mockDb.loadUser(response.user.id, true);
    } finally {
      setIsLoading(false);
    }
  };

  const enterGuestMode = async () => {
    setIsLoading(true);
    try {
      // Real backend session for the shared showcase account (dummy data lives
      // in the cloud DB) â€” no fake tokens, so nothing bounces off 401s.
      const response = await api.auth.guest();
      setToken(response.token);
      setUser(response.user);
      setStoredAuth(response.token, response.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    clearStoredAuth();
    setToken(null);
    setUser(null);
    mockDb.loadUser('anonymous');
  };

  const isGuest = user?.id === SEED_USER.id || user?.email === 'alex@ergonstudio.design';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        isLoading,
        isGuest,
        login,
        signup,
        loginWithGoogle,
        enterGuestMode,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
