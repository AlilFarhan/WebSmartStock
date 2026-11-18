import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/lib/auth';
import { z } from 'zod';
import type { ProcessTransactionRpcResponse } from '@/types/database';

const transactionSchema = z.object({
  productId: z.string().uuid('ID produk tidak valid'),
  type: z.enum(['IN', 'OUT', 'ADJUSTMENT']),
  amount: z.number().int('Jumlah harus bilangan bulat').min(0, 'Jumlah tidak boleh negatif'),
  referenceNote: z.string().optional().nullable(),
});

// Helper for non-blocking outbound webhook call
async function triggerLowStockWebhook(payload: {
  sku: string;
  product_name: string;
  current_stock: number;
  min_stock: number;
  unit: string;
}) {
  try {
    const adminSupabase = createAdminClient();

    // 1. Fetch webhook URL from app_settings or environment variable
    let webhookUrl = process.env.LOW_STOCK_WEBHOOK_URL;
    const { data: setting } = await adminSupabase
      .from('app_settings')
      .select('value')
      .eq('key', 'LOW_STOCK_WEBHOOK_URL')
      .single();

    if (setting?.value && setting.value.startsWith('http')) {
      webhookUrl = setting.value;
    }

    if (!webhookUrl || !webhookUrl.startsWith('http')) {
      return;
    }

    const body = {
      event: 'LOW_STOCK_ALERT',
      sku: payload.sku,
      product_name: payload.product_name,
      current_stock: payload.current_stock,
      min_stock: payload.min_stock,
      unit: payload.unit,
      timestamp: new Date().toISOString(),
    };

    // Non-blocking fetch with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SmartStock-Alerts/1.0',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
      .then((res) => {
        clearTimeout(timeoutId);
        if (!res.ok) {
          console.warn(`[SmartStock Webhook] Target returned status ${res.status}`);
        }
      })
      .catch((err) => {
        clearTimeout(timeoutId);
        console.error('[SmartStock Webhook] Error triggering webhook:', err.message);
      });
  } catch (err) {
    console.error('[SmartStock Webhook] Background job error:', err);
  }
}

export async function GET(request: NextRequest) {
  try {
    const { user, profile, error: authError } = await getCurrentUser();
    if (authError || !user || !profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '15', 10);
    const type = searchParams.get('type')?.trim().toUpperCase();
    const productId = searchParams.get('product_id')?.trim();
    const startDate = searchParams.get('start_date')?.trim();
    const endDate = searchParams.get('end_date')?.trim();

    const offset = (page - 1) * limit;
    const supabase = createClient();

    let query = supabase
      .from('stock_transactions')
      .select('*, products(id, sku, name, unit), profiles(id, full_name, email, role)', { count: 'exact' });

    if (type && ['IN', 'OUT', 'ADJUSTMENT'].includes(type)) {
      query = query.eq('type', type);
    }

    if (productId) {
      query = query.eq('product_id', productId);
    }

    if (startDate) {
      query = query.gte('created_at', new Date(startDate).toISOString());
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query = query.lte('created_at', end.toISOString());
    }

    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data: transactions, count, error } = await query;

    if (error) {
      console.error('Error fetching transactions:', error);
      return NextResponse.json({ error: 'Gagal mengambil data transaksi' }, { status: 500 });
    }

    return NextResponse.json({
      data: transactions || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit) || 1,
      },
    });
  } catch (err: any) {
    console.error('Transactions GET error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, profile, error: authError } = await getCurrentUser();
    if (authError || !user || !profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = transactionSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validasi data tidak valid', details: validated.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { productId, type, amount, referenceNote } = validated.data;
    const supabase = createClient();

    // Call PostgreSQL atomic RPC function
    const { data: rpcResult, error: rpcError } = await supabase.rpc('process_stock_transaction', {
      p_product_id: productId,
      p_user_id: user.id,
      p_type: type,
      p_amount: amount,
      p_note: referenceNote || null,
    });

    if (rpcError) {
      console.error('Error in process_stock_transaction RPC:', rpcError);
      return NextResponse.json(
        { error: rpcError.message || 'Gagal memproses transaksi stok' },
        { status: 400 }
      );
    }

    const result = rpcResult as ProcessTransactionRpcResponse;

    // Check if new_stock <= min_stock and trigger non-blocking webhook alert
    if (result.new_stock <= result.min_stock) {
      // Run non-blocking
      triggerLowStockWebhook({
        sku: result.sku,
        product_name: result.product_name,
        current_stock: result.new_stock,
        min_stock: result.min_stock,
        unit: result.unit,
      }).catch((e) => console.error('Webhook execution failed:', e));
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: `Transaksi ${type} berhasil diproses`,
    });
  } catch (err: any) {
    console.error('Transactions POST error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
