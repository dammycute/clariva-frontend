import { createClient } from '@supabase/supabase-js';

// Admin client with service_role key — for server-only operations
// Never expose NEXT_PUBLIC_SUPABASE_SERVICE_KEY to the browser
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
