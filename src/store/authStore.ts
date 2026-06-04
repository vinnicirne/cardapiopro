import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';

export interface Store {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  phone?: string;
  logo_url?: string;
  cover_url?: string;
  delivery_fee?: number;
  is_open?: boolean;
  opening_hours?: Record<string, { isOpen: boolean; open: string; close: string }>;
  plan_id?: string;
  plan?: {
    id: string;
    name: string;
    price: number;
    max_products: number;
    features: string[];
  };
}

interface AuthState {
  user: User | null;
  store: Store | null;
  isLoading: boolean;
  isSuperadmin: boolean;
  setUser: (user: User | null) => void;
  setStore: (store: Store | null) => void;
  setLoading: (isLoading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  store: null,
  isLoading: true,
  isSuperadmin: false,
  setUser: (user) => set({ user, isSuperadmin: user?.user_metadata?.is_superadmin === true }),
  setStore: (store) => set({ store }),
  setLoading: (isLoading) => set({ isLoading }),
}));
