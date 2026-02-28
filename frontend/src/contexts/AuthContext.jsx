import React, { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// 1. Create the Context
const AuthContext = createContext(null);

// 2. Create the Provider Component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Check for logged-in user on app start
  useEffect(() => {
    const storedUser = localStorage.getItem('app_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  // Login Function
  const login = (userData) => {
    // In a real app, userData would include token, role, email, etc.
    setUser(userData);
    localStorage.setItem('app_user', JSON.stringify(userData));
    navigate('/');
  };

  // Logout Function
  const logout = () => {
    setUser(null);
    localStorage.removeItem('app_user');
    navigate('/login');
  };

  // 3. Expose values
  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// 4. Custom Hook for easy access
export const useAuth = () => {
  return useContext(AuthContext);
};