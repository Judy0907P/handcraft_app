import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';

interface AuthContextType {
  user: { email: string; username: string; user_id?: string } | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, username: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<{ email: string; username: string; user_id?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    localStorage.removeItem('currentOrg');
    setUser(null);
  };

  useEffect(() => {
    // Check for stored token and user
    const token = localStorage.getItem('access_token');
    const storedUser = localStorage.getItem('user');
    if (token && storedUser) {
      setUser(JSON.parse(storedUser));
      // Verify token is still valid by fetching user info
      authApi.getMe()
        .then((response) => {
          const userData = {
            email: response.data.email,
            username: response.data.username,
            user_id: response.data.user_id,
          };
          localStorage.setItem('user', JSON.stringify(userData));
          setUser(userData);
          setIsLoading(false);
        })
        .catch(() => {
          // Token invalid, clear storage
          logout();
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await authApi.login({ email, password });
      const token = response.data.access_token;
      const userData = {
        email: response.data.email,
        username: response.data.username,
        user_id: response.data.user_id,
      };
      
      localStorage.setItem('access_token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Login failed');
    }
  };

  const register = async (email: string, password: string, username?: string) => {
    try {
      // Generate default username from email if not provided
      const finalUsername = username || email.split('@')[0] || 'user';
      const response = await authApi.register({ email, password, username: finalUsername });
      const token = response.data.access_token;
      const userData = {
        email: response.data.email,
        username: response.data.username,
        user_id: response.data.user_id,
      };
      
      localStorage.setItem('access_token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Registration failed');
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isAuthenticated: !!user, isLoading }}>
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

