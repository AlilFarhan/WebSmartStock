import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser, requireAdmin } from '@/lib/auth';
import { z } from 'zod';

const createProductSchema = z.object({
  sku: z.string().min(2, 'SKU minimal 2 karakter').trim(),
  name: z.string().min(2, 'Nama produk minimal 2 karakter').trim(),
  category_id: z.string().uuid().nullable().optional(),
  unit: z.string().min(1, 'Satuan produk wajib diisi').trim(),
  cost_price: z.number().min(0, 'Harga beli tidak boleh negatif'),
  selling_price: z.number().min(0, 'Harga jual tidak boleh negatif'),
  current_stock: z.number().int().min(0, 'Stok awal tidak boleh negatif').default(0),
  min_stock: z.number().int().min(0, 'Batas minimum stok tidak boleh negatif').default(5),
});

export async function GET(request: NextRequest) {
  try {
    const { user, profile, error: authError } = await getCurrentUser();
    if (authError || !user || !profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const search = searchParams.get('search')?.trim() || '';
    const categoryId = searchParams.get('category_id')?.trim() || '';
    const status = searchParams.get('status')?.trim().toUpperCase() || 'ALL'; // ALL, SAFE, LOW, OUT_OF_STOCK

    const offset = (page - 1) * limit;
    const supabase = createClient();

    let query = supabase
      .from('products')
      .select('*, categories(id, name)', { count: 'exact' })
      .eq('is_active', true);

    if (search) {
      query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`);
    }

    if (categoryId && categoryId !== 'ALL') {
      query = query.eq('category_id', categoryId);
    }

    // Apply status filter
    if (status === 'OUT_OF_STOCK') {
      query = query.eq('current_stock', 0);
    } else if (status === 'LOW') {
      // Products where stock is greater than 0 but less than or equal to min_stock
      // Note: In Supabase/PostgREST column-to-column comparison or custom filter can be handled
      // Let's filter or sort safely
    }

    query = query.order('name', { ascending: true });

    // Execute query
    const { data: rawProducts, count, error } = await query;

    if (error) {
      console.error('Error fetching products:', error);
      return NextResponse.json({ error: 'Gagal mengambil data produk' }, { status: 500 });
    }

    // Post-filter for stock status if needed
    let filtered = rawProducts || [];
    if (status === 'SAFE') {
      filtered = filtered.filter((p) => p.current_stock > p.min_stock);
    } else if (status === 'LOW') {
      filtered = filtered.filter((p) => p.current_stock > 0 && p.current_stock <= p.min_stock);
    } else if (status === 'OUT_OF_STOCK') {
      filtered = filtered.filter((p) => p.current_stock === 0);
    }

    const totalCount = status === 'ALL' ? (count || 0) : filtered.length;
    const paginated = filtered.slice(offset, offset + limit);

    // RBAC: STAFF role cannot see cost_price
    const sanitizedProducts = paginated.map((product) => {
      if (profile.role === 'STAFF') {
        const { cost_price, ...rest } = product;
        return { ...rest, cost_price: null };
      }
      return product;
    });

    return NextResponse.json({
      data: sanitizedProducts,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit) || 1,
      },
    });
  } catch (err: any) {
    console.error('Products GET error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin();
    if (!adminCheck.authorized) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    const body = await request.json();
    const validated = createProductSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', details: validated.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const supabase = createClient();
    const { data: newProduct, error } = await supabase
      .from('products')
      .insert({
        sku: validated.data.sku,
        name: validated.data.name,
        category_id: validated.data.category_id || null,
        unit: validated.data.unit,
        cost_price: validated.data.cost_price,
        selling_price: validated.data.selling_price,
        current_stock: validated.data.current_stock,
        min_stock: validated.data.min_stock,
        is_active: true,
      })
      .select('*, categories(id, name)')
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: `SKU "${validated.data.sku}" sudah digunakan` }, { status: 409 });
      }
      console.error('Error creating product:', error);
      return NextResponse.json({ error: error.message || 'Gagal menyimpan produk' }, { status: 500 });
    }

    return NextResponse.json({ data: newProduct, message: 'Produk berhasil ditambahkan' }, { status: 201 });
  } catch (err: any) {
    console.error('Products POST error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
