import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Profile } from '@/types/database';

const DEFAULT_ADMIN_EMAILS = ['chalilfarhan2560@gmail.com'];

export async function getCurrentUser() {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { user: null, profile: null, error: 'Unauthorized' };
  }

  const configuredAdminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const adminEmails = Array.from(new Set([...DEFAULT_ADMIN_EMAILS, ...configuredAdminEmails]));
  const userEmail = (user.email || '').toLowerCase().trim();
  const isSuperAdminEmail = adminEmails.includes(userEmail);

  // Fetch profile from database
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  let finalProfile: Profile;

  if (profileError || !profile) {
    // Fallback: If profile row not found via normal client, try admin client
    const adminSupabase = createAdminClient();
    const { data: adminProfile } = await adminSupabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (adminProfile) {
      finalProfile = adminProfile as Profile;
    } else {
      // Default profile object
      finalProfile = {
        id: user.id,
        full_name: (user.user_metadata?.full_name as string) || user.email?.split('@')[0] || 'User',
        email: user.email || '',
        role: isSuperAdminEmail ? 'ADMIN' : 'STAFF',
        created_at: new Date().toISOString(),
      };

      // Auto-insert profile row in database if missing
      adminSupabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: finalProfile.full_name,
          email: finalProfile.email,
          role: finalProfile.role,
        })
        .then(() => {})
        .catch((e) => console.error('Error inserting fallback profile:', e));
    }
  } else {
    finalProfile = profile as Profile;
  }

  // If email is in admin list but role in DB is still STAFF, elevate and sync to DB
  if (isSuperAdminEmail && finalProfile.role !== 'ADMIN') {
    finalProfile.role = 'ADMIN';

    const adminSupabase = createAdminClient();
    adminSupabase
      .from('profiles')
      .update({ role: 'ADMIN' })
      .eq('id', user.id)
      .then(() => {})
      .catch((e) => console.error('Error syncing ADMIN role to DB:', e));
  }

  return { user, profile: finalProfile, error: null };
}

export async function requireAdmin() {
  const { user, profile, error } = await getCurrentUser();
  if (error || !user || !profile) {
    return { authorized: false, status: 401, error: 'Unauthorized' };
  }

  if (profile.role !== 'ADMIN') {
    return { authorized: false, status: 403, error: 'Akses Ditolak: Memerlukan hak akses ADMIN' };
  }

  return { authorized: true, user, profile, status: 200, error: null };
}
