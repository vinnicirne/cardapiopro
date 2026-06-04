import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface PlatformSettings {
  platform_name: string;
  logo_url: string | null;
  primary_color: string;
  landing_title: string;
  landing_subtitle: string;
}

interface PlatformState {
  settings: PlatformSettings | null;
  isLoading: boolean;
  fetchSettings: () => Promise<void>;
  setSettings: (settings: PlatformSettings) => void;
}

export const usePlatformStore = create<PlatformState>((set) => ({
  settings: null,
  isLoading: true,
  fetchSettings: async () => {
    set({ isLoading: true });
    const { data, error } = await supabase
      .from('platform_settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (!error && data) {
      // Dynamic injection of CSS variables to change the theme easily
      if (data.primary_color) {
        document.documentElement.style.setProperty('--primary-color', data.primary_color);
      }
      set({ settings: data });
    }
    set({ isLoading: false });
  },
  setSettings: (settings) => {
    if (settings.primary_color) {
      document.documentElement.style.setProperty('--primary-color', settings.primary_color);
    }
    set({ settings });
  },
}));
