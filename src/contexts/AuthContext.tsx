import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';
import type { Organization, Profile, Location, TaxRate, TipSettings, AppRole } from '@/types/database';

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  organization: Organization | null;
  currentLocation: Location | null;
  locations: Location[];
  defaultTaxRate: TaxRate | null;
  tipSettings: TipSettings | null;
  loading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  setCurrentLocation: (location: Location) => void;
  hasRole: (minRole: AppRole) => boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const ROLE_HIERARCHY: Record<AppRole, number> = {
  owner: 3,
  manager: 2,
  cashier: 1,
  accountant: 0,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null, session: null, profile: null, organization: null,
    currentLocation: null, locations: [], defaultTaxRate: null,
    tipSettings: null, loading: true, isAuthenticated: false,
  });

  const loadUserContext = useCallback(async (user: User) => {
    try {
      const { data: profile } = await supabase
        .from('profiles').select('*').eq('user_id', user.id).single();

      if (!profile) {
        setState(prev => ({ ...prev, loading: false, user }));
        return;
      }

      const [orgRes, locRes, taxRes, tipRes] = await Promise.all([
        supabase.from('organizations').select('*').eq('id', profile.org_id).single(),
        supabase.from('locations').select('*').eq('org_id', profile.org_id).eq('is_active', true).order('is_default', { ascending: false }),
        supabase.from('tax_rates').select('*').eq('org_id', profile.org_id).eq('is_active', true).eq('is_default', true).limit(1),
        supabase.from('tip_settings').select('*').eq('org_id', profile.org_id).limit(1),
      ]);

      const locs = (locRes.data || []) as Location[];
      const savedLocId = localStorage.getItem('cobalt_current_location');
      const currentLoc = locs.find(l => l.id === savedLocId) || locs.find(l => l.is_default) || locs[0] || null;

      setState({
        user, session: null,
        profile: profile as Profile,
        organization: orgRes.data as Organization,
        currentLocation: currentLoc,
        locations: locs,
        defaultTaxRate: (taxRes.data?.[0] as TaxRate) || null,
        tipSettings: (tipRes.data?.[0] as TipSettings) || null,
        loading: false,
        isAuthenticated: true,
      });
    } catch (err) {
      console.error('Failed to load user context:', err);
      setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) loadUserContext(session.user);
      else setState(prev => ({ ...prev, loading: false }));
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) loadUserContext(session.user);
      else setState({
        user: null, session: null, profile: null, organization: null,
        currentLocation: null, locations: [], defaultTaxRate: null,
        tipSettings: null, loading: false, isAuthenticated: false,
      });
    });

    return () => subscription.unsubscribe();
  }, [loadUserContext]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) throw error;
  };

  const signOut = async () => { await supabase.auth.signOut(); };

  const setCurrentLocation = (location: Location) => {
    setState(prev => ({ ...prev, currentLocation: location }));
    localStorage.setItem('cobalt_current_location', location.id);
  };

  const hasRole = (minRole: AppRole): boolean => {
    if (!state.profile) return false;
    return ROLE_HIERARCHY[state.profile.role] >= ROLE_HIERARCHY[minRole];
  };

  const refreshProfile = async () => {
    if (state.user) await loadUserContext(state.user);
  };

  return (
    <AuthContext.Provider value={{
      ...state, signIn, signUp, signInWithGoogle, signOut,
      setCurrentLocation, hasRole, refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
