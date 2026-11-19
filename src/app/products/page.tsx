'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import {
  Package,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  ArrowUpDown,
  ArrowDownLeft,
  ArrowUpRight,
  AlertCircle,
  CheckCircle2,
  Boxes,
  QrCode,
  Printer,
  History,
  TrendingUp,
} from 'lucide-react';
import { Badge, StockStatusBadge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import type { Product, Category, UserRole, StockTransaction } from '@/types/database';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>('STAFF');

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SAFE' | 'LOW' | 'OUT_OF_STOCK'>('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [quickTxProduct, setQuickTxProduct] = useState<{
    product: Product;
    type: 'IN' | 'OUT';
  } | null>(null);

  // NEW FEATURE: Barcode / Label Print Modal
  const [printingProduct, setPrintingProduct] = useState<Product | null>(null);

  // NEW FEATURE: Product Transaction History Drawer/Modal
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
  const [historyList, setHistoryList] = useState<StockTransaction[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Form States
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    category_id: '',
    unit: 'pcs',
    cost_price: 0,
    selling_price: 0,
    current_stock: 0,
    min_stock: 5,
  });

  const [txAmount, setTxAmount] = useState(1);
  const [txNote, setTxNote] = useState('');
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Check Current User Role
  useEffect(() => {
    async function checkRole() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const json = await res.json();
          if (json.user?.role) {
            setCurrentUserRole(json.user.role);
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
    checkRole();
  }, []);

  // Fetch Categories
  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await fetch('/api/categories');
        if (res.ok) {
          const json = await res.json();
          setCategories(json.data || []);
        }
      } catch (e) {
        console.error(e);
      }
    }
    loadCategories();
  }, []);

  // Fetch Products
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        search: search.trim(),
        category_id: selectedCategory,
        status: statusFilter,
      });

      const res = await fetch(`/api/products?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Gagal memuat produk');
      }

      const json = await res.json();
      setProducts(json.data || []);
      setTotalPages(json.pagination?.totalPages || 1);
      setTotalCount(json.pagination?.total || 0);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, search, selectedCategory, statusFilter]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Load History for specific product
  const openHistoryModal = async (product: Product) => {
    setHistoryProduct(product);
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/transactions?product_id=${product.id}&limit=15`);
      if (res.ok) {
        const json = await res.json();
        setHistoryList(json.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const showNotification = (msg: string) => {
    setSuccessBanner(msg);
    setTimeout(() => setSuccessBanner(null), 3500);
  };

  // Handle Add Product Submit
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          cost_price: Number(formData.cost_price),
          selling_price: Number(formData.selling_price),
          current_stock: Number(formData.current_stock),
          min_stock: Number(formData.min_stock),
          category_id: formData.category_id || null,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Gagal menyimpan produk');
      }

      setIsAddOpen(false);
      showNotification(`Produk ${formData.name} (${formData.sku}) berhasil ditambahkan!`);
      setFormData({
        sku: '',
        name: '',
        category_id: '',
        unit: 'pcs',
        cost_price: 0,
        selling_price: 0,
        current_stock: 0,
        min_stock: 5,
      });
      fetchProducts();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setModalSubmitting(false);
    }
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    setModalSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/products/${editingProduct.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingProduct.name,
          category_id: editingProduct.category_id || null,
          unit: editingProduct.unit,
          cost_price: Number(editingProduct.cost_price),
          selling_price: Number(editingProduct.selling_price),
          min_stock: Number(editingProduct.min_stock),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Gagal memperbarui produk');
      }

      setEditingProduct(null);
      showNotification(`Produk ${editingProduct.name} berhasil diperbarui!`);
      fetchProducts();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setModalSubmitting(false);
    }
  };

  // Handle Soft Delete
  const handleDeleteConfirm = async () => {
    if (!deletingProduct) return;
    setModalSubmitting(true);

    try {
      const res = await fetch(`/api/products/${deletingProduct.id}`, {
        method: 'DELETE',
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Gagal menonaktifkan produk');
      }

      setDeletingProduct(null);
      showNotification(`Produk ${deletingProduct.name} berhasil dinonaktifkan`);
      fetchProducts();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setModalSubmitting(false);
    }
  };

  // Handle Quick Transaction Submit
  const handleQuickTxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTxProduct) return;

    setModalSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: quickTxProduct.product.id,
          type: quickTxProduct.type,
          amount: Number(txAmount),
          referenceNote: txNote || `Transaksi cepat ${quickTxProduct.type} dari daftar produk`,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Gagal memproses transaksi');
      }

      setQuickTxProduct(null);
      setTxAmount(1);
      setTxNote('');
      showNotification(`Transaksi ${quickTxProduct.type} untuk ${quickTxProduct.product.sku} berhasil diproses!`);
      fetchProducts();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setModalSubmitting(false);
    }
  };

  const formatRupiah = (val: number | null | undefined) => {
    if (val === null || val === undefined) return '-';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <AppLayout>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Master Data Produk & Inventaris
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Katalog barang, label barcode gudang, penetapan margin keuntungan & riwayat transaksi
          </p>
        </div>

        {currentUserRole === 'ADMIN' && (
          <button
            onClick={() => {
              setErrorMsg(null);
              setIsAddOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-600 text-white font-semibold rounded-xl text-sm shadow-lg shadow-indigo-600/30 transition-all self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Produk Baru</span>
          </button>
        )}
      </div>

      {successBanner && (
        <div className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-300 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{successBanner}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-slate-900/80 backdrop-blur-md p-4 rounded-2xl border border-slate-800/80 shadow-xl mb-6 space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Cari berdasarkan nama produk atau SKU..."
              className="w-full pl-10 pr-4 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Category Dropdown */}
          <div className="w-full md:w-56">
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setPage(1);
              }}
              className="w-full py-2 px-3 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">Semua Kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-2 pt-1 overflow-x-auto text-xs">
          <span className="text-slate-400 font-semibold mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Filter Status:
          </span>
          {[
            { id: 'ALL', label: 'Semua Status' },
            { id: 'SAFE', label: 'Aman' },
            { id: 'LOW', label: 'Menipis' },
            { id: 'OUT_OF_STOCK', label: 'Habis (0)' },
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => {
                setStatusFilter(pill.id as any);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                statusFilter === pill.id
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800/80 shadow-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Memuat daftar produk...</div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center">
            <Boxes className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-base font-bold text-white">Tidak ada produk ditemukan</p>
            <p className="text-xs text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian atau filter yang dipilih.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider font-semibold">
                  <th className="py-3 px-6">SKU & Produk</th>
                  <th className="py-3 px-6">Kategori</th>
                  {currentUserRole === 'ADMIN' && (
                    <th className="py-3 px-6 text-right">Harga Modal</th>
                  )}
                  <th className="py-3 px-6 text-right">Harga Jual</th>
                  {currentUserRole === 'ADMIN' && (
                    <th className="py-3 px-6 text-center">Margin</th>
                  )}
                  <th className="py-3 px-6 text-center">Stok / Min</th>
                  <th className="py-3 px-6 text-center">Status</th>
                  <th className="py-3 px-6 text-center">Mutasi Cepat</th>
                  <th className="py-3 px-6 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-medium">
                {products.map((p) => {
                  const cost = Number(p.cost_price) || 0;
                  const sell = Number(p.selling_price) || 0;
                  const marginPct = sell > 0 ? Math.round(((sell - cost) / sell) * 100) : 0;

                  return (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-6">
                        <div className="font-bold text-white">{p.name}</div>
                        <div className="text-xs text-indigo-400 font-mono mt-0.5">{p.sku}</div>
                      </td>
                      <td className="py-3.5 px-6 text-slate-400 text-xs">
                        {p.categories?.name || <span className="text-slate-500 italic">Tanpa Kategori</span>}
                      </td>
                      {currentUserRole === 'ADMIN' && (
                        <td className="py-3.5 px-6 text-right text-slate-400 text-xs font-mono">
                          {formatRupiah(p.cost_price)}
                        </td>
                      )}
                      <td className="py-3.5 px-6 text-right text-white font-semibold text-xs font-mono">
                        {formatRupiah(p.selling_price)}
                      </td>
                      {currentUserRole === 'ADMIN' && (
                        <td className="py-3.5 px-6 text-center">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                            marginPct >= 30 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            marginPct >= 15 ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                            'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            +{marginPct}%
                          </span>
                        </td>
                      )}
                      <td className="py-3.5 px-6 text-center">
                        <span className="font-extrabold text-white">{p.current_stock}</span>
                        <span className="text-xs text-slate-400"> / min {p.min_stock} {p.unit}</span>
                      </td>
                      <td className="py-3.5 px-6 text-center">
                        <StockStatusBadge currentStock={p.current_stock} minStock={p.min_stock} />
                      </td>
                      <td className="py-3.5 px-6 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setErrorMsg(null);
                              setQuickTxProduct({ product: p, type: 'IN' });
                            }}
                            title="Barang Masuk"
                            className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <ArrowDownLeft className="w-3.5 h-3.5" /> +IN
                          </button>
                          <button
                            onClick={() => {
                              setErrorMsg(null);
                              setQuickTxProduct({ product: p, type: 'OUT' });
                            }}
                            disabled={p.current_stock <= 0}
                            title="Barang Keluar"
                            className="px-2 py-1 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" /> -OUT
                          </button>
                        </div>
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        <div className="inline-flex items-center gap-1">
                          {/* Print Barcode Label Button */}
                          <button
                            onClick={() => setPrintingProduct(p)}
                            className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Cetak Label Barcode Gudang"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>

                          {/* Product History Log Button */}
                          <button
                            onClick={() => openHistoryModal(p)}
                            className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Riwayat Mutasi Produk"
                          >
                            <History className="w-4 h-4" />
                          </button>

                          {currentUserRole === 'ADMIN' && (
                            <>
                              <button
                                onClick={() => {
                                  setErrorMsg(null);
                                  setEditingProduct(p);
                                }}
                                className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                                title="Edit Produk"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeletingProduct(p)}
                                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                                title="Nonaktifkan Produk"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            Menampilkan <strong>{products.length}</strong> dari <strong>{totalCount}</strong> produk
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

      {/* NEW FEATURE MODAL: Cetak Label Barcode Gudang */}
      {printingProduct && (
        <Modal
          isOpen={!!printingProduct}
          onClose={() => setPrintingProduct(null)}
          title="Label Barcode Gudang (Print Ready)"
        >
          <div className="space-y-4">
            <div id="printable-area" className="p-6 bg-white rounded-xl border border-slate-200 text-slate-900 shadow-sm text-center">
              <div className="border-b border-dashed border-slate-300 pb-3 mb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">SMARTSTOCK GUDANG UTAMA</span>
                <h3 className="text-base font-black text-slate-900 mt-0.5">{printingProduct.name}</h3>
                <p className="text-xs text-slate-500">{printingProduct.categories?.name || 'Tanpa Kategori'}</p>
              </div>

              {/* Simulated Barcode */}
              <div className="py-3 flex flex-col items-center justify-center">
                <div className="h-16 w-52 bg-slate-900 flex items-center justify-between px-2 text-white">
                  {/* CSS barcode lines simulation */}
                  <div className="w-1.5 h-12 bg-white" />
                  <div className="w-0.5 h-12 bg-white" />
                  <div className="w-2 h-12 bg-white" />
                  <div className="w-1 h-12 bg-white" />
                  <div className="w-3 h-12 bg-white" />
                  <div className="w-0.5 h-12 bg-white" />
                  <div className="w-2 h-12 bg-white" />
                  <div className="w-1.5 h-12 bg-white" />
                  <div className="w-0.5 h-12 bg-white" />
                  <div className="w-2 h-12 bg-white" />
                </div>
                <span className="font-mono text-sm font-bold tracking-widest text-slate-800 mt-2">
                  *{printingProduct.sku}*
                </span>
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-between text-xs text-slate-600 font-medium">
                <span>Satuan: <strong className="text-slate-900 font-bold">{printingProduct.unit}</strong></span>
                <span>Harga Jual: <strong className="text-slate-900 font-bold">{formatRupiah(printingProduct.selling_price)}</strong></span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPrintingProduct(null)}
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
                <span>Cetak Label Sekarang</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* NEW FEATURE MODAL: Riwayat Mutasi Produk Spesifik */}
      {historyProduct && (
        <Modal
          isOpen={!!historyProduct}
          onClose={() => setHistoryProduct(null)}
          title={`Kartu Stok: ${historyProduct.sku}`}
          maxWidth="xl"
        >
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex justify-between items-center">
              <div>
                <p className="font-bold text-slate-800">{historyProduct.name}</p>
                <p className="text-slate-500">Stok Saat Ini: <strong className="text-indigo-600">{historyProduct.current_stock} {historyProduct.unit}</strong></p>
              </div>
              <StockStatusBadge currentStock={historyProduct.current_stock} minStock={historyProduct.min_stock} />
            </div>

            {loadingHistory ? (
              <p className="text-xs text-slate-400 text-center py-6">Memuat mutasi...</p>
            ) : historyList.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">Belum ada riwayat transaksi untuk produk ini.</p>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 uppercase font-semibold">
                    <tr>
                      <th className="py-2.5 px-4">Waktu</th>
                      <th className="py-2.5 px-4 text-center">Tipe</th>
                      <th className="py-2.5 px-4 text-center">Delta</th>
                      <th className="py-2.5 px-4 text-center">Stok</th>
                      <th className="py-2.5 px-4">Catatan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {historyList.map((h) => (
                      <tr key={h.id} className="hover:bg-slate-50">
                        <td className="py-2 px-4 text-slate-500 font-mono">
                          {new Date(h.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-2 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded font-bold ${
                            h.type === 'IN' ? 'bg-emerald-100 text-emerald-800' :
                            h.type === 'OUT' ? 'bg-rose-100 text-rose-800' :
                            'bg-purple-100 text-purple-800'
                          }`}>
                            {h.type}
                          </span>
                        </td>
                        <td className="py-2 px-4 text-center font-bold">
                          {h.quantity > 0 ? `+${h.quantity}` : h.quantity}
                        </td>
                        <td className="py-2 px-4 text-center text-slate-600">
                          {h.previous_stock} → <strong className="text-slate-900">{h.new_stock}</strong>
                        </td>
                        <td className="py-2 px-4 text-slate-500 truncate max-w-xs">
                          {h.reference_note || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Modal: Tambah Produk Baru */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Tambah Produk Baru"
        maxWidth="lg"
      >
        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Kode SKU <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                placeholder="Misal: BRG-001"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Kategori
              </label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">Pilih Kategori</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id} className="text-slate-900">
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Nama Produk <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Contoh: Kabel Data Fast Charging 2M"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Satuan <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                placeholder="pcs / dus / kg / roll"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Harga Modal (Beli)
              </label>
              <input
                type="number"
                min="0"
                value={formData.cost_price}
                onChange={(e) => setFormData({ ...formData, cost_price: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Harga Jual
              </label>
              <input
                type="number"
                min="0"
                value={formData.selling_price}
                onChange={(e) => setFormData({ ...formData, selling_price: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Stok Awal
              </label>
              <input
                type="number"
                min="0"
                value={formData.current_stock}
                onChange={(e) => setFormData({ ...formData, current_stock: parseInt(e.target.value, 10) || 0 })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Batas Minimum Stok (Alert)
              </label>
              <input
                type="number"
                min="0"
                value={formData.min_stock}
                onChange={(e) => setFormData({ ...formData, min_stock: parseInt(e.target.value, 10) || 0 })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={modalSubmitting}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-600/20 disabled:opacity-50 cursor-pointer"
            >
              {modalSubmitting ? 'Menyimpan...' : 'Simpan Produk'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Edit Produk */}
      {editingProduct && (
        <Modal
          isOpen={!!editingProduct}
          onClose={() => setEditingProduct(null)}
          title={`Edit Produk: ${editingProduct.sku}`}
          maxWidth="lg"
        >
          {errorMsg && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Nama Produk
              </label>
              <input
                type="text"
                required
                value={editingProduct.name}
                onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Kategori
                </label>
                <select
                  value={editingProduct.category_id || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, category_id: e.target.value || null })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="">Pilih Kategori</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id} className="text-slate-900">
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Satuan
                </label>
                <input
                  type="text"
                  required
                  value={editingProduct.unit}
                  onChange={(e) => setEditingProduct({ ...editingProduct, unit: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Harga Modal (Beli)
                </label>
                <input
                  type="number"
                  min="0"
                  value={editingProduct.cost_price ?? 0}
                  onChange={(e) => setEditingProduct({ ...editingProduct, cost_price: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Harga Jual
                </label>
                <input
                  type="number"
                  min="0"
                  value={editingProduct.selling_price}
                  onChange={(e) => setEditingProduct({ ...editingProduct, selling_price: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Batas Min. Stok
                </label>
                <input
                  type="number"
                  min="0"
                  value={editingProduct.min_stock}
                  onChange={(e) => setEditingProduct({ ...editingProduct, min_stock: parseInt(e.target.value, 10) || 0 })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={modalSubmitting}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-600/20 disabled:opacity-50 cursor-pointer"
              >
                {modalSubmitting ? 'Menyimpan...' : 'Perbarui Produk'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Quick Transaction IN / OUT */}
      {quickTxProduct && (
        <Modal
          isOpen={!!quickTxProduct}
          onClose={() => setQuickTxProduct(null)}
          title={`Transaksi Cepat: Barang ${quickTxProduct.type === 'IN' ? 'Masuk' : 'Keluar'}`}
        >
          {errorMsg && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleQuickTxSubmit} className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Produk:</span>
                <span className="font-bold text-slate-900">{quickTxProduct.product.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Kode SKU:</span>
                <span className="font-mono font-bold text-slate-800">{quickTxProduct.product.sku}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Stok Saat Ini:</span>
                <span className="font-bold text-indigo-600">
                  {quickTxProduct.product.current_stock} {quickTxProduct.product.unit}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Jumlah {quickTxProduct.type === 'IN' ? 'Masuk' : 'Keluar'} ({quickTxProduct.product.unit})
              </label>
              <input
                type="number"
                min="1"
                max={quickTxProduct.type === 'OUT' ? quickTxProduct.product.current_stock : undefined}
                required
                value={txAmount}
                onChange={(e) => setTxAmount(parseInt(e.target.value, 10) || 1)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Catatan / No. Referensi
              </label>
              <input
                type="text"
                value={txNote}
                onChange={(e) => setTxNote(e.target.value)}
                placeholder="Contoh: Faktur Penjualan #1029 atau PO-552"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setQuickTxProduct(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={modalSubmitting || txAmount <= 0}
                className={`px-5 py-2 text-white rounded-xl text-sm font-semibold shadow-md disabled:opacity-50 cursor-pointer ${
                  quickTxProduct.type === 'IN'
                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                    : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20'
                }`}
              >
                {modalSubmitting ? 'Memproses...' : `Konfirmasi ${quickTxProduct.type === 'IN' ? 'Masuk' : 'Keluar'}`}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Konfirmasi Soft Delete */}
      {deletingProduct && (
        <Modal
          isOpen={!!deletingProduct}
          onClose={() => setDeletingProduct(null)}
          title="Konfirmasi Nonaktifkan Produk"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Apakah Anda yakin ingin menonaktifkan produk{' '}
              <strong className="text-slate-900">{deletingProduct.name}</strong> ({deletingProduct.sku})?
            </p>
            <p className="text-xs text-slate-400">
              Produk yang dinonaktifkan tidak akan muncul lagi di daftar aktif, tetapi riwayat transaksi tetap tersimpan dengan aman untuk audit trail.
            </p>

            <div className="pt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingProduct(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={modalSubmitting}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-rose-600/20 disabled:opacity-50 cursor-pointer"
              >
                {modalSubmitting ? 'Memproses...' : 'Ya, Nonaktifkan'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </AppLayout>
  );
}
