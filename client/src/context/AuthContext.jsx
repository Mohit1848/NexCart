import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loginUserApi, fetchCurrentUserApi } from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('nexcart_token'));
  const [loading, setLoading] = useState(true);

  // Validate existing token with server on initial application load
  const loadVerifiedUser = useCallback(async () => {
    const storedToken = localStorage.getItem('nexcart_token');
    if (!storedToken) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      // Security: Always verify session and fetch role directly from backend /api/auth/me
      const verifiedUser = await fetchCurrentUserApi();
      setUser(verifiedUser);
      setToken(storedToken);
    } catch (err) {
      // If token is expired or invalid, clear it
      console.warn('Session verification failed, logging out:', err.response?.data?.error?.message || err.message);
      localStorage.removeItem('nexcart_token');
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVerifiedUser();
  }, [loadVerifiedUser]);

  // Login handler
  const login = async (email, password) => {
    const data = await loginUserApi(email, password);
    const { token: receivedToken, user: verifiedUser } = data;
    localStorage.setItem('nexcart_token', receivedToken);
    setToken(receivedToken);
    setUser(verifiedUser);
    return verifiedUser;
  };

  // Logout handler
  const logout = () => {
    localStorage.removeItem('nexcart_token');
    setToken(null);
    setUser(null);
  };

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAdmin,
        login,
        logout,
        refreshUser: loadVerifiedUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;

