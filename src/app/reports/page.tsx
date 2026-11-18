'use client';

import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Filter,
  ShieldAlert,
  Boxes,
  CircleDollarSign,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  ClipboardList,
} from 'lucide-react';
import type { UserRole } from '@/types/database';

interface LedgerItem {
  id: string;
  sku: string;
  name: string;
  unit: string;
  current_stock: number;
  cost_price: number;
}

export default function ReportsPage() {
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // Filter Dates
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1); // First day of current month
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Preview data
  const [products, setProducts] = useState<LedgerItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [isExporting, setIsExporting] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const json = await res.json();
          setCurrentUserRole(json.user?.role || 'STAFF');
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingUser(false);
      }
    }
    init();
  }, []);

  useEffect(() => {
    if (currentUserRole !== 'ADMIN') return;

    async function loadPreview() {
      try {
        setLoadingData(true);
        const res = await fetch('/api/products?limit=100&status=ALL');
        if (res.ok) {
          const json = await res.json();
          setProducts(json.data || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingData(false);
      }
    }
    loadPreview();
  }, [currentUserRole]);

  const handleExport = async (format: 'xlsx' | 'csv') => {
    try {
      setIsExporting(format);
      const params = new URLSearchParams({
        format,
        startDate,
        endDate,
      });

      const response = await fetch(`/api/reports/export?${params.toString()}`);
      if (!response.ok) {
        const errorJson = await response.json();
        throw new Error(errorJson.error || 'Gagal mengekspor laporan');
      }

      // Trigger browser download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SmartStock_Laporan_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert(err.message || 'Gagal mengekspor file');
    } finally {
      setIsExporting(null);
    }
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  if (loadingUser) {
    return (
      <AppLayout>
        <div className="p-12 text-center text-slate-400 text-sm">Memeriksa hak akses...</div>
      </AppLayout>
    );
  }

  if (currentUserRole !== 'ADMIN') {
    return (
      <AppLayout>
        <div className="max-w-md mx-auto my-12 bg-slate-900/90 backdrop-blur-md p-8 rounded-2xl border border-slate-800 text-center shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white">Akses Ditolak (Khusus Admin)</h2>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            Halaman rekapitulasi buku besar dan ekspor valuasi keuangan stok dibatasi hanya untuk pengguna dengan peran <strong className="text-white">ADMIN</strong>.
          </p>
        </div>
      </AppLayout>
    );
  }

  // Calculate summary metrics for preview
  const totalValuation = products.reduce((acc, p) => acc + (p.current_stock * (p.cost_price || 0)), 0);
  const totalUnits = products.reduce((acc, p) => acc + p.current_stock, 0);

  return (
    <AppLayout>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Laporan & Ekspor Inventaris
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Rekapitulasi mutasi buku besar inventaris, valuasi aset, dan ekspor spreadsheet resmi
          </p>
        </div>

        {/* Action Export Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => handleExport('csv')}
            disabled={!!isExporting}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold rounded-xl text-sm shadow-md transition-all disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting === 'csv' ? 'Mengekspor...' : 'Export CSV'}</span>
          </button>

          <button
            onClick={() => handleExport('xlsx')}
            disabled={!!isExporting}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 text-white font-semibold rounded-xl text-sm shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{isExporting === 'xlsx' ? 'Membuat Excel...' : 'Export Excel (.xlsx)'}</span>
          </button>
        </div>
      </div>

      {/* Date Range Selector & Info Banner */}
      <div className="bg-slate-900/80 backdrop-blur-md p-5 rounded-2xl border border-slate-800/80 shadow-xl mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-indigo-400" /> Periode Laporan:
            </span>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="py-1.5 px-3 bg-slate-800 border border-slate-700 rounded-lg text-xs font-medium text-white focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-xs text-slate-500">s/d</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="py-1.5 px-3 bg-slate-800 border border-slate-700 rounded-lg text-xs font-medium text-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold text-slate-300">
            <div>
              Total Fisik: <strong className="text-white">{totalUnits.toLocaleString('id-ID')} Unit</strong>
            </div>
            <div className="h-4 w-px bg-slate-700" />
            <div>
              Valuasi Aset:{' '}
              <strong className="text-emerald-400 font-bold">{formatRupiah(totalValuation)}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Stock Ledger Preview Table */}
      <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800/80 shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white">Pratinjau Buku Besar Stok (Stock Ledger)</h2>
            <p className="text-xs text-slate-400">Data ini akan disertakan dalam file Excel/CSV yang diunduh</p>
          </div>
          <span className="text-xs font-semibold text-slate-400 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
            {products.length} SKU
          </span>
        </div>

        {loadingData ? (
          <div className="p-12 text-center text-slate-400 text-sm">Menyiapkan pratinjau buku besar...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider font-semibold">
                  <th className="py-3 px-6">SKU</th>
                  <th className="py-3 px-6">Nama Produk</th>
                  <th className="py-3 px-6 text-center">Satuan</th>
                  <th className="py-3 px-6 text-center">Stok Akhir</th>
                  <th className="py-3 px-6 text-right">Harga Modal (Rp)</th>
                  <th className="py-3 px-6 text-right">Nilai Valuasi (Rp)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-medium">
                {products.map((p) => {
                  const valuation = p.current_stock * (p.cost_price || 0);
                  return (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-6 font-mono text-xs font-bold text-indigo-400">
                        {p.sku}
                      </td>
                      <td className="py-3.5 px-6 text-white font-semibold">
                        {p.name}
                      </td>
                      <td className="py-3.5 px-6 text-center text-slate-400 text-xs">
                        {p.unit}
                      </td>
                      <td className="py-3.5 px-6 text-center">
                        <span className="font-extrabold text-white">{p.current_stock}</span>
                      </td>
                      <td className="py-3.5 px-6 text-right font-mono text-xs text-slate-400">
                        {formatRupiah(p.cost_price || 0)}
                      </td>
                      <td className="py-3.5 px-6 text-right font-mono text-xs font-bold text-emerald-400">
                        {formatRupiah(valuation)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-950/80 font-bold border-t border-slate-800 text-xs">
                  <td colSpan={3} className="py-3.5 px-6 text-white uppercase tracking-wider">
                    Total Keseluruhan
                  </td>
                  <td className="py-3.5 px-6 text-center text-white font-extrabold">
                    {totalUnits.toLocaleString('id-ID')}
                  </td>
                  <td className="py-3.5 px-6 text-right text-slate-500">-</td>
                  <td className="py-3.5 px-6 text-right text-emerald-400 font-extrabold text-sm">
                    {formatRupiah(totalValuation)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
