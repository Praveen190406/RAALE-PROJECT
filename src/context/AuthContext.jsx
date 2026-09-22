import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(api.getToken());
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Validate existing token or auto-login with default clinician demo account
  useEffect(() => {
    async function initAuth() {
      const storedToken = api.getToken();
      if (storedToken) {
        try {
          const res = await api.getMe();
          if (res.success && res.user) {
            setUser(res.user);
            setToken(storedToken);
            setLoading(false);
            return;
          }
        } catch (e) {
          console.warn('Session expired or invalid, auto-authenticating default clinician account...');
          api.clearToken();
        }
      }

      // Auto-authenticate as default Senior Pharmacist so clinical session is ready
      try {
        const res = await api.login('ahmed@hospital.nhs.uk', 'doctor123');
        if (res.success && res.user) {
          setUser(res.user);
          setToken(res.token);
        }
      } catch (err) {
        console.warn('Auto-login failed, starting in unauthenticated state:', err.message);
      } finally {
        setLoading(false);
      }
    }

    initAuth();
  }, []);

  const login = async (email, password) => {
    setAuthError(null);
    try {
      const res = await api.login(email, password);
      if (res.success) {
        setUser(res.user);
        setToken(res.token);
        return { success: true, user: res.user };
      }
      return { success: false, message: res.message || 'Login failed' };
    } catch (err) {
      const msg = err.data?.message || err.message || 'Login failed';
      setAuthError(msg);
      return { success: false, message: msg };
    }
  };

  const register = async (name, email, password, role) => {
    setAuthError(null);
    try {
      const res = await api.register(name, email, password, role);
      if (res.success) {
        setUser(res.user);
        setToken(res.token);
        return { success: true, user: res.user };
      }
      return { success: false, message: res.message || 'Registration failed' };
    } catch (err) {
      const msg = err.data?.message || err.message || 'Registration failed';
      setAuthError(msg);
      return { success: false, message: msg };
    }
  };

  const logout = () => {
    api.clearToken();
    setUser(null);
    setToken(null);
  };

  // Quick switch role helper for demonstration / test convenience
  const switchQuickClinician = async (clinicianEmail) => {
    try {
      const res = await api.login(clinicianEmail, clinicianEmail.includes('nurse') ? 'nurse123' : 'doctor123');
      if (res.success) {
        setUser(res.user);
        setToken(res.token);
        return { success: true };
      }
    } catch (err) {
      console.error('Switch clinician error:', err);
    }
    return { success: false };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        loading,
        authError,
        login,
        register,
        logout,
        switchQuickClinician,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
