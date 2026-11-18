import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser, requireAdmin } from '@/lib/auth';
import { z } from 'zod';

const categorySchema = z.object({
  name: z.string().min(2, 'Nama kategori minimal 2 karakter').trim(),
});

export async function GET() {
  try {
    const { user } = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient();
    const { data: categories, error } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching categories:', error);
      return NextResponse.json({ error: 'Gagal mengambil kategori' }, { status: 500 });
    }

    return NextResponse.json({ data: categories || [] });
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
    const validated = categorySchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', details: validated.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('categories')
      .insert({ name: validated.data.name })
      .select('*')
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Kategori dengan nama tersebut sudah ada' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message || 'Gagal membuat kategori' }, { status: 500 });
    }

    return NextResponse.json({ data, message: 'Kategori berhasil ditambahkan' }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
