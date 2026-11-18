import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import * as XLSX from 'xlsx';
import type { StockLedgerItem } from '@/types/database';

export async function GET(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin();
    if (!adminCheck.authorized) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    const { searchParams } = new URL(request.url);
    const format = (searchParams.get('format') || 'xlsx').toLowerCase();
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');

    const supabase = createClient();

    // 1. Fetch all active products
    const { data: products, error: prodError } = await supabase
      .from('products')
      .select('id, sku, name, unit, cost_price, current_stock')
      .eq('is_active', true)
      .order('sku', { ascending: true });

    if (prodError || !products) {
      return NextResponse.json({ error: 'Gagal memuat produk untuk laporan' }, { status: 500 });
    }

    // 2. Fetch transactions within range if dates provided
    let txQuery = supabase
      .from('stock_transactions')
      .select('product_id, type, quantity, previous_stock, new_stock, created_at')
      .order('created_at', { ascending: true });

    if (startDateStr) {
      txQuery = txQuery.gte('created_at', new Date(startDateStr).toISOString());
    }

    if (endDateStr) {
      const end = new Date(endDateStr);
      end.setHours(23, 59, 59, 999);
      txQuery = txQuery.lte('created_at', end.toISOString());
    }

    const { data: transactions, error: txError } = await txQuery;
    if (txError) {
      console.error('Error fetching transactions for export:', txError);
    }

    // Build ledger summary per product
    const ledgerMap: Record<string, { totalIn: number; totalOut: number; adjustments: number; firstPrevStock?: number; lastNewStock?: number }> = {};
    products.forEach((p) => {
      ledgerMap[p.id] = { totalIn: 0, totalOut: 0, adjustments: 0 };
    });

    (transactions || []).forEach((tx) => {
      if (ledgerMap[tx.product_id]) {
        const item = ledgerMap[tx.product_id];
        if (item.firstPrevStock === undefined) {
          item.firstPrevStock = tx.previous_stock;
        }
        item.lastNewStock = tx.new_stock;

        if (tx.type === 'IN') {
          item.totalIn += Math.abs(tx.quantity);
        } else if (tx.type === 'OUT') {
          item.totalOut += Math.abs(tx.quantity);
        } else if (tx.type === 'ADJUSTMENT') {
          item.adjustments += tx.quantity;
        }
      }
    });

    const reportRows = products.map((p) => {
      const summary = ledgerMap[p.id];
      const costPrice = Number(p.cost_price) || 0;
      
      // Calculate opening stock and closing stock
      const openingStock = summary.firstPrevStock !== undefined 
        ? summary.firstPrevStock 
        : p.current_stock;

      const closingStock = summary.lastNewStock !== undefined
        ? summary.lastNewStock
        : p.current_stock;

      const valuation = closingStock * costPrice;

      return {
        'Kode SKU': p.sku,
        'Nama Produk': p.name,
        'Satuan': p.unit,
        'Stok Awal': openingStock,
        'Total Masuk': summary.totalIn,
        'Total Keluar': summary.totalOut,
        'Penyesuaian (Opname)': summary.adjustments,
        'Stok Akhir': closingStock,
        'Harga Beli (Rp)': costPrice,
        'Valuasi Aset (Rp)': valuation,
      };
    });

    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(reportRows);

    // Auto-fit column widths
    const columnWidths = [
      { wch: 14 }, // SKU
      { wch: 35 }, // Name
      { wch: 10 }, // Unit
      { wch: 12 }, // Opening
      { wch: 14 }, // In
      { wch: 14 }, // Out
      { wch: 22 }, // Adjustment
      { wch: 12 }, // Closing
      { wch: 16 }, // Cost
      { wch: 20 }, // Valuation
    ];
    worksheet['!cols'] = columnWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan Inventaris');

    const dateStamp = new Date().toISOString().split('T')[0];
    const fileName = `SmartStock_Laporan_${dateStamp}.${format === 'csv' ? 'csv' : 'xlsx'}`;

    if (format === 'csv') {
      const csvData = XLSX.utils.sheet_to_csv(worksheet);
      return new NextResponse(csvData, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${fileName}"`,
        },
      });
    }

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (err: any) {
    console.error('Reports export error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
