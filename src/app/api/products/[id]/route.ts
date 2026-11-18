import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { z } from 'zod';

const updateProductSchema = z.object({
  name: z.string().min(2).optional(),
  category_id: z.string().uuid().nullable().optional(),
  unit: z.string().min(1).optional(),
  cost_price: z.number().min(0).optional(),
  selling_price: z.number().min(0).optional(),
  min_stock: z.number().int().min(0).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const adminCheck = await requireAdmin();
    if (!adminCheck.authorized) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    const { id } = params;
    const body = await request.json();
    const validated = updateProductSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validasi data tidak valid', details: validated.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const supabase = createClient();
    const updateData: Record<string, any> = {
      ...validated.data,
      updated_at: new Date().toISOString(),
    };

    const { data: updatedProduct, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', id)
      .select('*, categories(id, name)')
      .single();

    if (error) {
      console.error('Error updating product:', error);
      return NextResponse.json({ error: error.message || 'Gagal memperbarui produk' }, { status: 500 });
    }

    return NextResponse.json({ data: updatedProduct, message: 'Produk berhasil diperbarui' });
  } catch (err: any) {
    console.error('Product PATCH error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const adminCheck = await requireAdmin();
    if (!adminCheck.authorized) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    const { id } = params;
    const supabase = createClient();

    // Soft delete: is_active = false
    const { data, error } = await supabase
      .from('products')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, name, sku')
      .single();

    if (error) {
      console.error('Error soft-deleting product:', error);
      return NextResponse.json({ error: error.message || 'Gagal menghapus produk' }, { status: 500 });
    }

    return NextResponse.json({
      message: `Produk "${data.name}" (${data.sku}) berhasil dinonaktifkan`,
    });
  } catch (err: any) {
    console.error('Product DELETE error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
