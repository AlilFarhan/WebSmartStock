import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';

export async function GET() {
  try {
    const adminCheck = await requireAdmin();
    if (!adminCheck.authorized) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    const supabase = createClient();
    const { data: settings, error } = await supabase
      .from('app_settings')
      .select('*');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const settingsMap: Record<string, string> = {};
    (settings || []).forEach((s) => {
      settingsMap[s.key] = s.value;
    });

    return NextResponse.json({ data: settingsMap });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin();
    if (!adminCheck.authorized) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    const body = await request.json();
    const { key, value } = body;

    if (!key || typeof value !== 'string') {
      return NextResponse.json({ error: 'Key dan value harus disediakan' }, { status: 400 });
    }

    const supabase = createClient();
    const { error } = await supabase
      .from('app_settings')
      .upsert({ key, value });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Pengaturan berhasil disimpan' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
