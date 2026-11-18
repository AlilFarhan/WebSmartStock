'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import {
  Boxes,
  Layers,
  CircleDollarSign,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  PlusCircle,
  RefreshCw,
  CheckCircle2,
  PackageX,
  TrendingUp,
  Percent,
  Sparkles,
  ShieldCheck,
  FileSpreadsheet,
  ClipboardList,
  Printer,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import type { DashboardSummary } from '@/types/database';

export default function DashboardPage() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Quick Restock Modal State
  const [restockItem, setRestockItem] = useState<{
    id: string;
    sku: string;
    name: string;
    current_stock: number;
    unit: string;
  } | null>(null);
  const [restockAmount, setRestockAmount] = useState<number>(10);
  const [restockNote, setRestockNote] = useState<string>('Restock cepat dari dashboard');
  const [restockSubmitting, setRestockSubmitting] = useState(false);
  const [restockSuccessMsg, setRestockSuccessMsg] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/dashboard/summary');
      if (!res.ok) {
        throw new Error('Gagal memuat ringkasan dashboard');
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleQuickRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockItem) return;

    try {
      setRestockSubmitting(true);
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: restockItem.id,
          type: 'IN',
          amount: Number(restockAmount),
          referenceNote: restockNote,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Gagal melakukan restock');
      }

      setRestockSuccessMsg(`Berhasil restock ${restockAmount} ${restockItem.unit} untuk ${restockItem.sku}!`);
      setTimeout(() => {
        setRestockItem(null);
        setRestockSuccessMsg(null);
        fetchDashboardData();
      }, 1200);
    } catch (err: any) {
      alert(err.message || 'Gagal memproses restock');
    } finally {
      setRestockSubmitting(false);
    }
  };

  const formatRupiah = (val: number | null) => {
    if (val === null || val === undefined) return '-';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Calculate Health Score
  const totalSkus = data?.totalActiveSkus || 0;
  const lowSkus = data?.lowStockCount || 0;
  const safeSkus = Math.max(0, totalSkus - lowSkus);
  const healthPercentage = totalSkus > 0 ? Math.round((safeSkus / totalSkus) * 100) : 100;

  return (
    <AppLayout>
      {/* Page Header with Quick Action Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-indigo-400" /> SmartStock Live Insights
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Ringkasan & Analitik Gudang
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Pemantauan pergerakan inventaris, valuasi modal, serta deteksi stok kritis secara real-time
          </p>
        </div>

        {/* Quick Shortcut Buttons */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          <Link
            href="/transactions"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-200 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all shadow-sm"
          >
            <ClipboardList className="w-3.5 h-3.5 text-indigo-400" />
            <span>Stock Opname</span>
          </Link>

          <Link
            href="/reports"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-200 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all shadow-sm"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Ekspor Laporan</span>
          </Link>

          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Segarkan</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-300 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchDashboardData} className="underline font-semibold ml-2">Coba lagi</button>
        </div>
      )}

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
        {/* Card 1: Total SKU */}
        <div className="bg-slate-900/80 backdrop-blur-md p-5 rounded-2xl border border-slate-800/80 shadow-xl hover:border-slate-700 transition-all relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total SKU Aktif</span>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
              <Boxes className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-black text-white tracking-tight">
              {loading ? '...' : (data?.totalActiveSkus ?? 0)}
            </p>
            <p className="text-xs text-slate-400 mt-1 font-medium">Varian produk katalog gudang</p>
          </div>
        </div>

        {/* Card 2: Total Unit Fisik */}
        <div className="bg-slate-900/80 backdrop-blur-md p-5 rounded-2xl border border-slate-800/80 shadow-xl hover:border-slate-700 transition-all relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Unit Fisik</span>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-black text-white tracking-tight">
              {loading ? '...' : (data?.totalPhysicalUnits ?? 0).toLocaleString('id-ID')}
            </p>
            <p className="text-xs text-slate-400 mt-1 font-medium">Total kuantitas barang tersimpan</p>
          </div>
        </div>

        {/* Card 3: Valuasi Aset */}
        <div className="bg-slate-900/80 backdrop-blur-md p-5 rounded-2xl border border-slate-800/80 shadow-xl hover:border-slate-700 transition-all relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Valuasi Aset Gudang</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <CircleDollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            {data?.inventoryValuation !== null ? (
              <>
                <p className="text-2xl font-black text-emerald-400 tracking-tight truncate">
                  {loading ? '...' : formatRupiah(data?.inventoryValuation ?? 0)}
                </p>
                <p className="text-xs text-slate-400 mt-1 font-medium flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Berdasarkan harga modal
                </p>
              </>
            ) : (
              <>
                <p className="text-lg font-bold text-slate-400 mt-1">Akses Khusus Admin</p>
                <p className="text-xs text-slate-500 mt-1">Dirahasiakan untuk Staff</p>
              </>
            )}
          </div>
        </div>

        {/* Card 4: Stok Menipis */}
        <div className="bg-slate-900/80 backdrop-blur-md p-5 rounded-2xl border border-slate-800/80 shadow-xl hover:border-slate-700 transition-all relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl group-hover:bg-rose-500/20 transition-all pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Stok Kritis</span>
            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${
              (data?.lowStockCount ?? 0) > 0 
                ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' 
                : 'bg-slate-800 text-slate-500 border-slate-700'
            }`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <p className={`text-3xl font-black tracking-tight ${
                (data?.lowStockCount ?? 0) > 0 ? 'text-rose-400' : 'text-white'
              }`}>
                {loading ? '...' : (data?.lowStockCount ?? 0)}
              </p>
              <span className="text-xs text-slate-400">SKU</span>
            </div>
            <p className="text-xs text-slate-400 mt-1 font-medium">Menyentuh batas minimum stok</p>
          </div>
        </div>
      </div>

      {/* NEW FEATURE: Indikator Kesehatan Inventaris (Stock Health Index) */}
      <div className="bg-slate-900/80 backdrop-blur-md p-5 rounded-2xl border border-slate-800/80 shadow-xl mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
              Skor Kesehatan Gudang: <span className={healthPercentage >= 80 ? 'text-emerald-400' : healthPercentage >= 50 ? 'text-amber-400' : 'text-rose-400'}>{healthPercentage}% Optimal</span>
            </h3>
            <p className="text-xs text-slate-400">
              {safeSkus} dari {totalSkus} produk memiliki ketersediaan stok yang mencukupi
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> {safeSkus} Aman
            </span>
            <span className="flex items-center gap-1.5 text-rose-400 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> {lowSkus} Kritis / Habis
            </span>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden flex">
          <div 
            style={{ width: `${healthPercentage}%` }} 
            className="bg-gradient-to-r from-emerald-500 to-indigo-500 transition-all duration-500" 
          />
          <div 
            style={{ width: `${100 - healthPercentage}%` }} 
            className="bg-rose-500 transition-all duration-500" 
          />
        </div>
      </div>

      {/* Chart Section: 7-Day Stock Movement */}
      <div className="bg-slate-900/80 backdrop-blur-md p-5 sm:p-6 rounded-2xl border border-slate-800/80 shadow-xl mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span>Pergerakan Stok (7 Hari Terakhir)</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">IN vs OUT</span>
            </h2>
            <p className="text-xs text-slate-400">Grafik komparasi kuantitas barang masuk versus barang keluar</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block shadow-sm shadow-emerald-500/50" /> Barang Masuk (+IN)
            </span>
            <span className="flex items-center gap-1.5 text-indigo-400">
              <span className="w-3 h-3 rounded-full bg-indigo-500 inline-block shadow-sm shadow-indigo-500/50" /> Barang Keluar (-OUT)
            </span>
          </div>
        </div>

        <div className="h-72 w-full">
          {loading ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm">
              Memuat grafik pergerakan...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data?.chartData || []}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#64748b" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={{ stroke: '#334155' }} 
                />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '12px',
                    borderColor: '#334155',
                    color: '#fff',
                    fontSize: '12px',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
                  }}
                  itemStyle={{ color: '#fff' }}
                />
                <Bar dataKey="barangMasuk" name="Barang Masuk" fill="#10b981" radius={[4, 4, 0, 0]} barSize={22} />
                <Bar dataKey="barangKeluar" name="Barang Keluar" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={22} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Urgent Low-Stock Table */}
      <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800/80 shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shadow-md shadow-rose-500/50" />
            <h2 className="text-base font-bold text-white">Daftar Produk Kritis / Stok Menipis</h2>
          </div>
          <span className="text-xs font-semibold text-slate-400 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
            {data?.lowStockItems?.length || 0} SKU Terdeteksi
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Memeriksa level stok produk...</div>
        ) : !data?.lowStockItems || data.lowStockItems.length === 0 ? (
          <div className="p-10 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
            <p className="text-sm font-bold text-white">Semua Stok Dalam Kondisi Aman!</p>
            <p className="text-xs text-slate-400 mt-0.5">Tidak ada produk yang menyentuh batas stok minimum saat ini.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider font-semibold">
                  <th className="py-3 px-6">SKU & Produk</th>
                  <th className="py-3 px-6">Kategori</th>
                  <th className="py-3 px-6 text-center">Stok Saat Ini</th>
                  <th className="py-3 px-6 text-center">Batas Minimum</th>
                  <th className="py-3 px-6 text-center">Status</th>
                  <th className="py-3 px-6 text-right">Aksi Cepat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-medium">
                {data.lowStockItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-6">
                      <div className="font-bold text-white">{item.name}</div>
                      <div className="text-xs text-indigo-400 font-mono mt-0.5">{item.sku}</div>
                    </td>
                    <td className="py-3.5 px-6 text-slate-400 text-xs">
                      {item.category_name}
                    </td>
                    <td className="py-3.5 px-6 text-center">
                      <span className={`font-extrabold ${item.current_stock === 0 ? 'text-rose-400' : 'text-amber-400'}`}>
                        {item.current_stock}
                      </span>{' '}
                      <span className="text-xs text-slate-400">{item.unit}</span>
                    </td>
                    <td className="py-3.5 px-6 text-center text-slate-400 text-xs">
                      {item.min_stock} {item.unit}
                    </td>
                    <td className="py-3.5 px-6 text-center">
                      {item.current_stock === 0 ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          Habis (0)
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          Menipis ({item.current_stock})
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <button
                        onClick={() => {
                          setRestockItem(item);
                          setRestockAmount(Math.max(10, item.min_stock * 2));
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-emerald-600/25 transition-all cursor-pointer"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>Restock Cepat</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Restock Cepat Modal */}
      {restockItem && (
        <Modal
          isOpen={!!restockItem}
          onClose={() => setRestockItem(null)}
          title={`Restock Cepat: ${restockItem.name}`}
        >
          {restockSuccessMsg ? (
            <div className="py-6 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-2 animate-bounce" />
              <p className="text-base font-bold text-slate-800">{restockSuccessMsg}</p>
            </div>
          ) : (
            <form onSubmit={handleQuickRestockSubmit} className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Kode SKU:</span>
                  <span className="font-mono font-bold text-slate-800">{restockItem.sku}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Stok Saat Ini:</span>
                  <span className="font-bold text-rose-600">{restockItem.current_stock} {restockItem.unit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Batas Minimum:</span>
                  <span className="font-medium text-slate-700">{restockItem.min_stock} {restockItem.unit}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Jumlah Tambahan Masuk ({restockItem.unit})
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={restockAmount}
                  onChange={(e) => setRestockAmount(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Stok baru setelah masuk: <strong className="text-slate-800 font-bold">{restockItem.current_stock + (Number(restockAmount) || 0)} {restockItem.unit}</strong>
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Catatan Referensi
                </label>
                <input
                  type="text"
                  value={restockNote}
                  onChange={(e) => setRestockNote(e.target.value)}
                  placeholder="Contoh: PO-2026/Supplier ABC"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRestockItem(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={restockSubmitting || restockAmount <= 0}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-emerald-600/20 disabled:opacity-50 cursor-pointer"
                >
                  {restockSubmitting ? 'Memproses...' : 'Konfirmasi Masuk'}
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </AppLayout>
  );
}
