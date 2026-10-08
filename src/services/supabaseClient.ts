/**
 * Re-export the shared Supabase client from src/lib/supabase.ts
 * Ensuring single unified client initialization across the entire application.
 */
export { supabase, isSupabaseConfigured } from '../lib/supabase';
