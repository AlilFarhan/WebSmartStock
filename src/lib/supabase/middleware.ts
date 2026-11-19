import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://shpxuyqrwogccbtasool.supabase.co';
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'sb_publishable_xvwmn3TL0OmfJ5Ou4MSyTg_jPSdxXgi';

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // getUser safely validates auth token against Supabase auth server
  const { data: { user } } = await supabase.auth.getUser();

  const isLoginPage = request.nextUrl.pathname.startsWith('/login');
  const isResetPasswordPage = request.nextUrl.pathname.startsWith('/reset-password');
  const isAuthCallback = request.nextUrl.pathname.startsWith('/auth');
  const isAuthPage = isLoginPage || isResetPasswordPage || isAuthCallback;
  const isApiRoute = request.nextUrl.pathname.startsWith('/api');

  // If user is not logged in and trying to access protected routes
  if (!user && !isAuthPage && !isApiRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // If user is logged in and trying to access login page, redirect to dashboard
  if (user && isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return response;
}
