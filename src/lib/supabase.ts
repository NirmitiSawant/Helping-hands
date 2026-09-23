import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase Configuration loaded from environment variables
const ENV_URL = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const ENV_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

export function isSupabaseConfigured(): boolean {
  return Boolean(
    ENV_URL &&
    ENV_ANON_KEY &&
    !ENV_URL.includes('your-project') &&
    !ENV_ANON_KEY.includes('your-anon-key') &&
    ENV_URL.startsWith('http')
  );
}

let _supabaseClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (_supabaseClient) {
    return _supabaseClient;
  }

  const url = isSupabaseConfigured() ? ENV_URL : 'https://placeholder-project.supabase.co';
  const anonKey = isSupabaseConfigured() ? ENV_ANON_KEY : 'placeholder-anon-key';

  _supabaseClient = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return _supabaseClient;
}

// Log activity helper
export async function logActivity(
  actionType: string,
  description: string,
  userId?: string | null,
  entityId?: string | null,
  entityType?: string | null,
  metadata: Record<string, unknown> = {}
) {
  try {
    const supabase = getSupabase();
    await supabase.from('activity_logs').insert([
      {
        action_type: actionType,
        description,
        user_id: userId || null,
        entity_id: entityId || null,
        entity_type: entityType || null,
        metadata,
      },
    ]);
  } catch (err) {
    console.error('Failed to write activity log:', err);
  }
}
