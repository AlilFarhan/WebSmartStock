'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import {
  ArrowLeftRight,
  ArrowDownLeft,
  ArrowUpRight,
  ClipboardList,
  Filter,
  Search,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  User,
  PlusCircle,
  Printer,
  FileText,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import type { StockTransaction, Product } from '@/types/database';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // New Transaction Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'IN' | 'OUT' | 'ADJUSTMENT'>('IN');
  const [selectedProdId, setSelectedProdId] = useState('');
  const [amount, setAmount] = useState<number>(1);
  const [referenceNote, setReferenceNote] = useState('');
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // NEW FEATURE: Print Transaction Receipt / Surat Jalan Modal
  const [printingTx, setPrintingTx] = useState<StockTransaction | null>(null);

  // Fetch active products list for dropdowns
  useEffect(() => {
    async function loadProducts() {
      try {
        const res = await fetch('/api/products?limit=100&status=ALL');
        if (res.ok) {
          const json = await res.json();
          setProducts(json.data || []);
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadProducts();
  }, []);

  // Fetch Transactions Audit Trail
  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '15',
      });

      if (selectedType !== 'ALL') params.append('type', selectedType);
      if (selectedProduct) params.append('product_id', selectedProduct);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);

      const res = await fetch(`/api/transactions?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Gagal memuat riwayat transaksi');
      }

      const json = await res.json();
      setTransactions(json.data || []);
      setTotalPages(json.pagination?.totalPages || 1);
      setTotalCount(json.pagination?.total || 0);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, selectedType, selectedProduct, startDate, endDate]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Selected product object for modal live preview
  const currentModalProd = products.find((p) => p.id === selectedProdId);

  // Calculate live delta for Stock Opname preview
  const opnameDifference = currentModalProd ? amount - currentModalProd.current_stock : 0;

  const handleTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProdId) {
      setErrorMsg('Silakan pilih produk terlebih dahulu');
      return;
    }

    setModalSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProdId,
          type: modalTab,
          amount: Number(amount),
          referenceNote: referenceNote || null,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Gagal memproses transaksi');
      }

      setIsModalOpen(false);
      setSuccessBanner(`Transaksi ${modalTab} berhasil dicatat dalam kartu stok.`);
      setTimeout(() => setSuccessBanner(null), 3500);

      // Reset modal fields
      setAmount(1);
      setReferenceNote('');
      setSelectedProdId('');

      // Refresh list
      fetchTransactions();

      // Refresh products list to update current stock values
      fetch('/api/products?limit=100&status=ALL')
        .then((r) => r.json())
        .then((d) => setProducts(d.data || []));
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setModalSubmitting(false);
    }
  };

  const setDateFilterPreset = (preset: 'TODAY' | 'WEEK' | 'MONTH' | 'ALL') => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (preset === 'TODAY') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'WEEK') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      setStartDate(d.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === 'MONTH') {
      const d = new Date();
      d.setDate(1);
      setStartDate(d.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else {
      setStartDate('');
      setEndDate('');
    }
    setPage(1);
  };

  const formatDateTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Riwayat Transaksi & Stock Opname
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Kartu stok digital terenkripsi, audit trail barang masuk, barang keluar & penyesuaian fisik
          </p>
        </div>

        <button
          onClick={() => {
            setErrorMsg(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-600 text-white font-semibold rounded-xl text-sm shadow-lg shadow-indigo-600/30 transition-all self-start sm:self-auto cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Input Transaksi Baru</span>
        </button>
      </div>

      {successBanner && (
        <div className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-300 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{successBanner}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-slate-900/80 backdrop-blur-md p-4 rounded-2xl border border-slate-800/80 shadow-xl mb-6 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Filter Type */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Jenis Transaksi</label>
            <select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                setPage(1);
              }}
              className="w-full py-2 px-3 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">Semua Jenis Transaksi</option>
              <option value="IN">Barang Masuk (IN)</option>
              <option value="OUT">Barang Keluar (OUT)</option>
              <option value="ADJUSTMENT">Stock Opname (ADJUSTMENT)</option>
            </select>
          </div>

          {/* Filter Product */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Filter Produk</label>
            <select
              value={selectedProduct}
              onChange={(e) => {
                setSelectedProduct(e.target.value);
                setPage(1);
              }}
              className="w-full py-2 px-3 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Semua Produk</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku} - {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Dari Tanggal</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="w-full py-2 px-3 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Sampai Tanggal</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="w-full py-2 px-3 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Date Filter Quick Presets */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-800 text-xs text-slate-400">
          <span className="font-semibold">Preset Cepat:</span>
          <button
            onClick={() => setDateFilterPreset('TODAY')}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            Hari Ini
          </button>
          <button
            onClick={() => setDateFilterPreset('WEEK')}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            7 Hari Terakhir
          </button>
          <button
            onClick={() => setDateFilterPreset('MONTH')}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            Bulan Ini
          </button>
          <button
            onClick={() => setDateFilterPreset('ALL')}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Kartu Stok Audit Table */}
      <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800/80 shadow-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Memuat log transaksi...</div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center">
            <ArrowLeftRight className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-base font-bold text-white">Belum ada riwayat transaksi</p>
            <p className="text-xs text-slate-400 mt-1">Gunakan tombol &quot;Input Transaksi Baru&quot; untuk menambahkan mutasi stok pertama.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider font-semibold">
                  <th className="py-3 px-6">Waktu & Tanggal</th>
                  <th className="py-3 px-6">SKU & Produk</th>
                  <th className="py-3 px-6 text-center">Tipe Transaksi</th>
                  <th className="py-3 px-6 text-center">Perubahan (Delta)</th>
                  <th className="py-3 px-6 text-center">Stok Awal → Akhir</th>
                  <th className="py-3 px-6">Referensi / Catatan</th>
                  <th className="py-3 px-6 text-center">Petugas</th>
                  <th className="py-3 px-6 text-right">Bukti</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-medium">
                {transactions.map((tx) => {
                  const isPositive = tx.quantity > 0;
                  const isNegative = tx.quantity < 0;

                  return (
                    <tr key={tx.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-6 whitespace-nowrap text-xs text-slate-400 font-mono">
                        {formatDateTime(tx.created_at)}
                      </td>
                      <td className="py-3.5 px-6">
                        <div className="font-bold text-white">{tx.products?.name || 'Produk'}</div>
                        <div className="text-xs text-indigo-400 font-mono mt-0.5">{tx.products?.sku}</div>
                      </td>
                      <td className="py-3.5 px-6 text-center">
                        {tx.type === 'IN' && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 inline-flex items-center gap-1">
                            <ArrowDownLeft className="w-3 h-3" /> MASUK
                          </span>
                        )}
                        {tx.type === 'OUT' && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 inline-flex items-center gap-1">
                            <ArrowUpRight className="w-3 h-3" /> KELUAR
                          </span>
                        )}
                        {tx.type === 'ADJUSTMENT' && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 inline-flex items-center gap-1">
                            <ClipboardList className="w-3 h-3" /> OPNAME
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-6 text-center">
                        <span
                          className={`font-black font-mono text-sm ${
                            isPositive
                              ? 'text-emerald-400'
                              : isNegative
                              ? 'text-rose-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {isPositive ? `+${tx.quantity}` : tx.quantity}{' '}
                          <span className="text-xs font-normal text-slate-500">{tx.products?.unit}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-center font-mono text-xs">
                        <span className="text-slate-500">{tx.previous_stock}</span>
                        <span className="text-slate-600 mx-1.5">→</span>
                        <span className="font-bold text-white">{tx.new_stock}</span>
                      </td>
                      <td className="py-3.5 px-6 text-slate-400 text-xs max-w-xs truncate">
                        {tx.reference_note || <span className="text-slate-600 italic">-</span>}
                      </td>
                      <td className="py-3.5 px-6 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-300 font-semibold bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700">
                          <User className="w-3 h-3 text-indigo-400" />
                          {tx.profiles?.full_name || 'Petugas'}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        <button
                          onClick={() => setPrintingTx(tx)}
                          className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                          title="Cetak Bukti Mutasi / Surat Jalan"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            Menampilkan <strong>{transactions.length}</strong> dari <strong>{totalCount}</strong> catatan transaksi
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg disabled:opacity-40 cursor-pointer"
            >
              Sebelumnya
            </button>
            <span className="font-medium text-slate-300">
              Halaman {page} dari {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg disabled:opacity-40 cursor-pointer"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      </div>

      {/* NEW FEATURE MODAL: Cetak Bukti Tanda Terima / Surat Jalan */}
      {printingTx && (
        <Modal
          isOpen={!!printingTx}
          onClose={() => setPrintingTx(null)}
          title="Bukti Tanda Terima Mutasi (Surat Jalan)"
        >
          <div className="space-y-4">
            <div id="printable-area" className="p-6 bg-white rounded-xl border border-slate-200 text-slate-900 shadow-sm">
              <div className="border-b pb-4 mb-4 flex justify-between items-start">
                <div>
                  <h3 className="font-black text-lg text-slate-900">SMARTSTOCK WAREHOUSE</h3>
                  <p className="text-xs text-slate-500">Bukti Mutasi & Tanda Terima Barang</p>
                </div>
                <div className="text-right text-xs">
                  <p className="font-mono font-bold text-slate-800">NO: {printingTx.id.slice(0, 8).toUpperCase()}</p>
                  <p className="text-slate-500">{formatDateTime(printingTx.created_at)}</p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Tipe Mutasi</span>
                    <strong className="text-slate-900 text-sm font-black">
                      {printingTx.type === 'IN' ? 'BARANG MASUK (IN)' : printingTx.type === 'OUT' ? 'BARANG KELUAR (OUT)' : 'PENYESUAIAN STOCK OPNAME'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Petugas Gudang</span>
                    <strong className="text-slate-900 font-semibold">{printingTx.profiles?.full_name || 'Petugas'}</strong>
                  </div>
                </div>

                <div className="border rounded-lg p-3 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Nama Produk:</span>
                    <strong className="text-slate-900">{printingTx.products?.name}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Kode SKU:</span>
                    <strong className="font-mono text-slate-900">{printingTx.products?.sku}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Kuantitas Mutasi:</span>
                    <strong className="text-indigo-600 text-sm font-bold">
                      {printingTx.quantity > 0 ? `+${printingTx.quantity}` : printingTx.quantity} {printingTx.products?.unit}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Perubahan Stok:</span>
                    <span className="font-mono text-slate-700">{printingTx.previous_stock} → <strong>{printingTx.new_stock}</strong> {printingTx.products?.unit}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t">
                    <span className="text-slate-500">No. Ref / Catatan:</span>
                    <span className="text-slate-800 italic">{printingTx.reference_note || '-'}</span>
                  </div>
                </div>

                <div className="pt-8 grid grid-cols-2 gap-8 text-center text-[11px] text-slate-600">
                  <div>
                    <p className="mb-12">Diserahkan Oleh,</p>
                    <div className="w-28 mx-auto border-b border-slate-400" />
                    <p className="mt-1 font-semibold">( ........................ )</p>
                  </div>
                  <div>
                    <p className="mb-12">Diterima Oleh,</p>
                    <div className="w-28 mx-auto border-b border-slate-400" />
                    <p className="mt-1 font-semibold">( {printingTx.profiles?.full_name || 'Petugas Gudang'} )</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPrintingTx(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/30 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Dokumen</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Input Transaksi Baru */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Input Transaksi Inventaris"
        maxWidth="lg"
      >
        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Tabs for Transaction Type */}
        <div className="flex rounded-xl bg-slate-100 p-1 mb-5">
          <button
            type="button"
            onClick={() => {
              setModalTab('IN');
              setAmount(1);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              modalTab === 'IN' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowDownLeft className="w-4 h-4" /> Barang Masuk
          </button>
          <button
            type="button"
            onClick={() => {
              setModalTab('OUT');
              setAmount(1);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              modalTab === 'OUT' ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowUpRight className="w-4 h-4" /> Barang Keluar
          </button>
          <button
            type="button"
            onClick={() => {
              setModalTab('ADJUSTMENT');
              if (currentModalProd) setAmount(currentModalProd.current_stock);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              modalTab === 'ADJUSTMENT' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ClipboardList className="w-4 h-4" /> Stock Opname
          </button>
        </div>

        <form onSubmit={handleTransactionSubmit} className="space-y-4">
          {/* Select Product */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Pilih Produk <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={selectedProdId}
              onChange={(e) => {
                const id = e.target.value;
                setSelectedProdId(id);
                const p = products.find((prod) => prod.id === id);
                if (p && modalTab === 'ADJUSTMENT') {
                  setAmount(p.current_stock);
                }
              }}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="" className="text-slate-900">-- Pilih Produk Inventaris --</option>
              {products.map((p) => (
                <option key={p.id} value={p.id} className="text-slate-900">
                  [{p.sku}] {p.name} (Stok: {p.current_stock} {p.unit})
                </option>
              ))}
            </select>
          </div>

          {/* Quantity Input / Physical Stock Count */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              {modalTab === 'IN' && 'Jumlah Barang Masuk'}
              {modalTab === 'OUT' && 'Jumlah Barang Keluar'}
              {modalTab === 'ADJUSTMENT' && 'Hasil Hitung Stok Fisik (Aktual)'}
            </label>
            <input
              type="number"
              min="0"
              required
              value={amount}
              onChange={(e) => setAmount(parseInt(e.target.value, 10) || 0)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Realtime Live Stock Difference Preview (Especially for Stock Opname!) */}
          {currentModalProd && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
              <div className="font-bold text-slate-800 flex items-center justify-between">
                <span>Pratinjau Dampak Stok:</span>
                <span className="font-mono text-indigo-600 font-bold">{currentModalProd.sku}</span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                <div className="bg-white p-2 rounded-lg border border-slate-100">
                  <div className="text-[10px] text-slate-400">Stok Sistem</div>
                  <div className="font-extrabold text-slate-800 text-sm">
                    {currentModalProd.current_stock} {currentModalProd.unit}
                  </div>
                </div>

                <div className="bg-white p-2 rounded-lg border border-slate-100">
                  <div className="text-[10px] text-slate-400">
                    {modalTab === 'ADJUSTMENT' ? 'Fisik Aktual' : 'Mutasi'}
                  </div>
                  <div className="font-extrabold text-indigo-600 text-sm">
                    {modalTab === 'IN' && `+${amount}`}
                    {modalTab === 'OUT' && `-${amount}`}
                    {modalTab === 'ADJUSTMENT' && `${amount}`} {currentModalProd.unit}
                  </div>
                </div>

                <div className="bg-white p-2 rounded-lg border border-slate-100">
                  <div className="text-[10px] text-slate-400">Stok Akhir Baru</div>
                  <div className="font-extrabold text-emerald-600 text-sm">
                    {modalTab === 'IN' && currentModalProd.current_stock + amount}
                    {modalTab === 'OUT' && currentModalProd.current_stock - amount}
                    {modalTab === 'ADJUSTMENT' && amount} {currentModalProd.unit}
                  </div>
                </div>
              </div>

              {modalTab === 'ADJUSTMENT' && (
                <div className={`p-2 rounded-lg font-semibold text-center text-xs ${
                  opnameDifference > 0
                    ? 'bg-emerald-50 text-emerald-700'
                    : opnameDifference < 0
                    ? 'bg-rose-50 text-rose-700'
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {opnameDifference > 0 && `Selisih Lebih: +${opnameDifference} ${currentModalProd.unit} (Barang bertambah)`}
                  {opnameDifference < 0 && `Selisih Kurang: ${opnameDifference} ${currentModalProd.unit} (Barang berkurang/hilang)`}
                  {opnameDifference === 0 && 'Sesuai: Tidak ada selisih stok fisik'}
                </div>
              )}
            </div>
          )}

          {/* Reference Note */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Catatan / Dokumen Referensi
            </label>
            <input
              type="text"
              value={referenceNote}
              onChange={(e) => setReferenceNote(e.target.value)}
              placeholder="Contoh: No. Surat Jalan, Nota Pembelian, atau Alasan Opname"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={modalSubmitting || !selectedProdId || (modalTab !== 'ADJUSTMENT' && amount <= 0)}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-600/20 disabled:opacity-50 cursor-pointer"
            >
              {modalSubmitting ? 'Memproses...' : 'Simpan Transaksi'}
            </button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
