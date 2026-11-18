import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://shpxuyqrwogccbtasool.supabase.co';
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_xvwmn3TL0OmfJ5Ou4MSyTg_jPSdxXgi';

export const createClient = (cookieStore?: Awaited<ReturnType<typeof cookies>>) => {
  const store = cookieStore || cookies();
  return createServerClient(
    supabaseUrl!,
    supabaseKey!,
    {
      cookies: {
        getAll() {
          return typeof store.getAll === 'function' ? store.getAll() : [];
        },
        setAll(cookiesToSet) {
          try {
            if (typeof store.set === 'function') {
              cookiesToSet.forEach(({ name, value, options }) => store.set(name, value, options));
            }
          } catch {
            // The `setAll` method was called from a Server Component.
          }
        },
      },
    },
  );
};
