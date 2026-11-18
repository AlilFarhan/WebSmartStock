import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createClient(customCookieStore?: any) {
  const cookieStore = customCookieStore || cookies();

  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    'https://shpxuyqrwogccbtasool.supabase.co';

  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'sb_publishable_xvwmn3TL0OmfJ5Ou4MSyTg_jPSdxXgi';

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return typeof cookieStore.getAll === 'function' ? cookieStore.getAll() : [];
      },
      setAll(cookiesToSet) {
        try {
          if (typeof cookieStore.set === 'function') {
            cookiesToSet.forEach(({ name, value, options }: any) =>
              cookieStore.set(name, value, options)
            );
          }
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing user sessions.
        }
      },
    },
  });
}
