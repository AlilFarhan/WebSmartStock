import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import type { DashboardSummary } from '@/types/database';

export async function GET() {
  try {
    const { user, profile, error: authError } = await getCurrentUser();
    if (authError || !user || !profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient();

    // 1. Fetch all active products
    const { data: products, error: prodError } = await supabase
      .from('products')
      .select('id, sku, name, unit, cost_price, selling_price, current_stock, min_stock, categories(name)')
      .eq('is_active', true);

    if (prodError) {
      console.error('Error fetching products for dashboard:', prodError);
      return NextResponse.json({ error: 'Gagal mengambil data produk' }, { status: 500 });
    }

    const totalActiveSkus = products?.length || 0;
    let totalPhysicalUnits = 0;
    let totalValuation = 0;
    const lowStockItems: DashboardSummary['lowStockItems'] = [];

    (products || []).forEach((p: any) => {
      const stock = Number(p.current_stock) || 0;
      const cost = Number(p.cost_price) || 0;
      const minStock = Number(p.min_stock) || 0;

      totalPhysicalUnits += stock;
      totalValuation += stock * cost;

      if (stock <= minStock) {
        lowStockItems.push({
          id: p.id,
          sku: p.sku,
          name: p.name,
          current_stock: stock,
          min_stock: minStock,
          unit: p.unit,
          category_name: p.categories?.name || 'Tanpa Kategori',
        });
      }
    });

    // 2. Fetch last 7 days of transactions for chart aggregation
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const { data: transactions, error: txError } = await supabase
      .from('stock_transactions')
      .select('type, quantity, created_at')
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: true });

    if (txError) {
      console.error('Error fetching transactions for dashboard:', txError);
    }

    // Build 7-day timeline map (Indonesian date format: e.g. "12 Nov" or "Sen, 12")
    const dateMap: Record<string, { barangMasuk: number; barangKeluar: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
      dateMap[key] = { barangMasuk: 0, barangKeluar: 0 };
    }

    (transactions || []).forEach((tx) => {
      const txDate = new Date(tx.created_at);
      const key = txDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
      if (dateMap[key]) {
        if (tx.type === 'IN') {
          dateMap[key].barangMasuk += Math.abs(tx.quantity);
        } else if (tx.type === 'OUT') {
          dateMap[key].barangKeluar += Math.abs(tx.quantity);
        }
      }
    });

    const chartData = Object.entries(dateMap).map(([date, counts]) => ({
      date,
      barangMasuk: counts.barangMasuk,
      barangKeluar: counts.barangKeluar,
    }));

    const responsePayload: DashboardSummary = {
      totalActiveSkus,
      totalPhysicalUnits,
      // Staff members do NOT see inventory valuation
      inventoryValuation: profile.role === 'ADMIN' ? totalValuation : null,
      lowStockCount: lowStockItems.length,
      lowStockItems,
      chartData,
    };

    return NextResponse.json(responsePayload);
  } catch (err: any) {
    console.error('Dashboard summary error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
