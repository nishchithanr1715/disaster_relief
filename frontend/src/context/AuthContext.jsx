import React, { createContext, useState, useContext, useEffect } from 'react';
import { getMe, login as loginApi, register as registerApi } from '../api/auth';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const userData = await getMe();
          setUser(userData);
          localStorage.setItem('reliefsync_user_profile', JSON.stringify(userData));
        } catch (err) {
          // If it's a network/offline error, do NOT log them out. Fallback to cached profile!
          if (!err.response) {
            const cachedUser = localStorage.getItem('reliefsync_user_profile');
            if (cachedUser) {
              setUser(JSON.parse(cachedUser));
            } else {
              setUser(null);
            }
          } else {
            // Real authentication failure (e.g. 401, 403), remove session
            localStorage.removeItem('token');
            localStorage.removeItem('reliefsync_user_profile');
            setUser(null);
          }
        }
      }
      setLoading(false);
    };
    loadUser();
  }, []);

  const login = async (credentials) => {
    setError(null);
    try {
      const data = await loginApi(credentials);
      localStorage.setItem('token', data.token);
      localStorage.setItem('reliefsync_user_profile', JSON.stringify(data.user));
      setUser(data.user);
      return data.user;
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed';
      setError(message);
      throw new Error(message);
    }
  };

  const register = async (userData) => {
    setError(null);
    try {
      const data = await registerApi(userData);
      localStorage.setItem('token', data.token);
      localStorage.setItem('reliefsync_user_profile', JSON.stringify(data.user));
      setUser(data.user);
      return data.user;
    } catch (err) {
      const message = err.response?.data?.message || 'Registration failed';
      setError(message);
      throw new Error(message);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('reliefsync_user_profile');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
