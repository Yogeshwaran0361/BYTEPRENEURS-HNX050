import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Profile, OlderAdult, Caregiver, UserRole } from '../types';
import {
  authService,
  SeniorRegistrationPayload,
  CaregiverRegistrationPayload,
} from '../services/authService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AuthContextType {
  profile: Profile | null;
  olderAdult: OlderAdult | null;
  caregiver: Caregiver | null;
  role: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  onboardingCompleted: boolean;
  login: (email: string, password?: string) => Promise<{ success: boolean; error?: string; role?: UserRole }>;
  registerSenior: (payload: SeniorRegistrationPayload) => Promise<{ success: boolean; error?: string }>;
  registerCaregiver: (payload: CaregiverRegistrationPayload) => Promise<{ success: boolean; error?: string }>;
  completeOnboarding: () => Promise<void>;
  logout: () => Promise<void>;
  switchRole: (role: UserRole) => Promise<void>;
  updateCaregiverProfile: (updates: {
    fullName?: string;
    email?: string;
    phone?: string;
    relationshipType?: string;
  }) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [olderAdult, setOlderAdult] = useState<OlderAdult | null>(null);
  const [caregiver, setCaregiver] = useState<Caregiver | null>(null);
  const [role, setRole] = useState<UserRole>('senior');
  const [isLoading, setIsLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    try {
      const [profRes, adultRes, careRes] = await Promise.all([
        authService.getCurrentProfile(),
        authService.getCurrentOlderAdult(),
        authService.getCurrentCaregiver(),
      ]);

      if (profRes.data) {
        setProfile(profRes.data);
        const savedRole = (localStorage.getItem('nestcare_active_role') as UserRole) || profRes.data.role;
        setRole(savedRole);
        setOlderAdult(adultRes.data || null);
        setCaregiver(careRes.data || null);
      } else {
        setProfile(null);
        setOlderAdult(null);
        setCaregiver(null);
        const saved = (localStorage.getItem('nestcare_active_role') as UserRole) || 'senior';
        setRole(saved);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();

    if (isSupabaseConfigured && supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!session) {
          setProfile(null);
          setOlderAdult(null);
          setCaregiver(null);
        } else {
          refreshSession();
        }
      });
      return () => {
        subscription.unsubscribe();
      };
    }
  }, [refreshSession]);

  const login = async (email: string, password?: string) => {
    setIsLoading(true);
    try {
      const res = await authService.login(email, password);
      if (res.data) {
        setProfile(res.data);
        setRole(res.data.role);
        await refreshSession();
        return { success: true, role: res.data.role };
      }
      return { success: false, error: res.error || 'Login failed' };
    } finally {
      setIsLoading(false);
    }
  };

  const registerSenior = async (payload: SeniorRegistrationPayload) => {
    setIsLoading(true);
    try {
      const res = await authService.registerSenior(payload);
      if (res.data) {
        setProfile(res.data);
        setRole('senior');
        await refreshSession();
        return { success: true };
      }
      return { success: false, error: res.error || 'Registration failed' };
    } finally {
      setIsLoading(false);
    }
  };

  const registerCaregiver = async (payload: CaregiverRegistrationPayload) => {
    setIsLoading(true);
    try {
      const res = await authService.registerCaregiver(payload);
      if (res.data) {
        setProfile(res.data);
        setRole('caregiver');
        await refreshSession();
        return { success: true };
      }
      return { success: false, error: res.error || 'Registration failed' };
    } finally {
      setIsLoading(false);
    }
  };

  const completeOnboarding = async () => {
    if (!profile) return;
    const res = await authService.completeOnboarding(profile.id);
    if (res.data) {
      setProfile(res.data);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authService.logout();
      setProfile(null);
      setOlderAdult(null);
      setCaregiver(null);
    } finally {
      setIsLoading(false);
    }
  };

  const switchRole = async (targetRole: UserRole) => {
    localStorage.setItem('nestcare_active_role', targetRole);
    setRole(targetRole);
    try {
      const res = await authService.switchRole(targetRole);
      if (res.data) {
        setProfile(res.data);
      }
    } catch (e) {
      // non-blocking
    }
  };

  const updateCaregiverProfile = async (updates: {
    fullName?: string;
    email?: string;
    phone?: string;
    relationshipType?: string;
  }) => {
    try {
      const res = await authService.updateCaregiverProfile(updates);
      if (res.data) {
        setCaregiver(res.data);
        if (res.data.profile) {
          setProfile(res.data.profile);
        }
        await refreshSession();
        return { success: true };
      }
      return { success: false, error: res.error || 'Failed to update profile' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to update profile' };
    }
  };

  const isAuthenticated = Boolean(profile);
  const onboardingCompleted = Boolean(profile?.onboarding_completed);

  return (
    <AuthContext.Provider
      value={{
        profile,
        olderAdult,
        caregiver,
        role,
        isAuthenticated,
        isLoading,
        onboardingCompleted,
        login,
        registerSenior,
        registerCaregiver,
        completeOnboarding,
        logout,
        switchRole,
        updateCaregiverProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
