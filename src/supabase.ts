import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: 'pkce',
    storage: {
      getItem: (key: string) => {
        if (typeof document === 'undefined') return null;
        const match = document.cookie.match(new RegExp('(^| )' + key + '=([^;]+)'));
        return match?.[2] ? decodeURIComponent(match[2]) : null;
      },
      setItem: (key: string, value: string) => {
        if (typeof document === 'undefined') return;
        const secure = window.location.protocol === 'https:' ? '; Secure' : '';
        document.cookie = `${key}=${encodeURIComponent(value)}; path=/; max-age=31536000; SameSite=Lax${secure}`;
      },
      removeItem: (key: string) => {
        if (typeof document === 'undefined') return;
        document.cookie = `${key}=; path=/; max-age=0`;
      },
    },
  },
});
