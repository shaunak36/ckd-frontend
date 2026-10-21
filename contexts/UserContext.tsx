"use client";

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export type UserProfile = {
  id: string;
  full_name: string;
  role: string;
  [key: string]: any;
};

type UserContextType = {
  userProfile: UserProfile | null;
  setUserProfile: (profile: UserProfile | null) => void;
  refetchProfile: () => Promise<void>;
  loading: boolean;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('user_profiles').select('*').eq('id', user.id).single();
      setUserProfile(data || null);
    } else {
      setUserProfile(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProfile();
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        fetchProfile();
      }
    });
    return () => authListener.subscription.unsubscribe();
  }, []);

  return (
    <UserContext.Provider value={{ userProfile, setUserProfile, refetchProfile: fetchProfile, loading }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
