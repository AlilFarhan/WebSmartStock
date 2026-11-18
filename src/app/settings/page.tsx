'use client';

import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import {
  Settings,
  BellRing,
  Tag,
  Plus,
  Send,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Radio,
  ExternalLink,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import type { Category, UserRole } from '@/types/database';

export default function SettingsPage() {
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // Categories State
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [addingCategory, setAddingCategory] = useState(false);

  // Webhook State
  const [webhookUrl, setWebhookUrl] = useState('');
  const [savingWebhook, setSavingWebhook] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    latencyMs?: number;
    status?: number;
  } | null>(null);

  // Notifications
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

  const loadSettingsAndCategories = async () => {
    try {
      const catRes = await fetch('/api/categories');
      if (catRes.ok) {
        const catJson = await catRes.json();
        setCategories(catJson.data || []);
      }

      const setRes = await fetch('/api/settings');
      if (setRes.ok) {
        const setJson = await setRes.json();
        if (setJson.data?.LOW_STOCK_WEBHOOK_URL) {
          setWebhookUrl(setJson.data.LOW_STOCK_WEBHOOK_URL);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (currentUserRole === 'ADMIN') {
      loadSettingsAndCategories();
    }
  }, [currentUserRole]);

  const showNotification = (type: 'success' | 'error', text: string) => {
    setBanner({ type, text });
    setTimeout(() => setBanner(null), 4000);
  };

  // Add Category
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    setAddingCategory(true);
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCatName.trim() }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Gagal menambahkan kategori');
      }

      setNewCatName('');
      showNotification('success', `Kategori "${json.data.name}" berhasil ditambahkan!`);
      loadSettingsAndCategories();
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setAddingCategory(false);
    }
  };

  // Save Webhook URL
  const handleSaveWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingWebhook(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'LOW_STOCK_WEBHOOK_URL',
          value: webhookUrl.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Gagal menyimpan webhook');
      }

      showNotification('success', 'URL Webhook berhasil disimpan di database!');
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setSavingWebhook(false);
    }
  };

  // Test Webhook
  const handleTestWebhook = async () => {
    if (!webhookUrl.trim()) {
      showNotification('error', 'Masukkan URL webhook terlebih dahulu sebelum menguji');
      return;
    }

    setTestingWebhook(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/settings/test-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: webhookUrl.trim() }),
      });

      const json = await res.json();
      if (!res.ok) {
        setTestResult({
          success: false,
          message: json.error || 'Pengujian gagal',
        });
      } else {
        setTestResult({
          success: true,
          message: json.message,
          latencyMs: json.latencyMs,
          status: json.status,
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Gagal menghubungi server',
      });
    } finally {
      setTestingWebhook(false);
    }
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
            Halaman pengaturan sistem dan integrasi webhook n8n/Telegram dibatasi hanya untuk pengguna dengan hak akses <strong className="text-white">ADMIN</strong>.
          </p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Pengaturan Sistem & Integrasi Webhook
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Konfigurasi kategori master, outbound webhook otomatis untuk n8n/Telegram saat stok menipis
        </p>
      </div>

      {banner && (
        <div
          className={`mb-6 p-4 rounded-xl text-sm flex items-center gap-2 border ${
            banner.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {banner.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span>{banner.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 1: Outbound Webhook Integration */}
        <div className="bg-slate-900/80 backdrop-blur-md p-6 rounded-2xl border border-slate-800/80 shadow-xl space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Notifikasi Otomatis Stok Menipis</h2>
              <p className="text-xs text-slate-400">Webhook outbound ke n8n, Make, Telegram bot, atau Slack</p>
            </div>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Ketika ada transaksi yang menyebabkan stok suatu barang berada pada atau di bawah batas minimum (<code className="bg-slate-800 px-1 py-0.5 rounded text-indigo-300 font-mono">current_stock &le; min_stock</code>), sistem secara non-blocking akan mengirim HTTP POST JSON ke URL webhook ini.
          </p>

          <form onSubmit={handleSaveWebhook} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                Endpoint Webhook URL
              </label>
              <input
                type="url"
                required
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://n8n.your-domain.com/webhook/low-stock-alert"
                className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm font-mono text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Tip: Anda dapat menggunakan layanan gratis seperti <a href="https://webhook.site" target="_blank" rel="noreferrer" className="text-indigo-400 underline font-semibold">webhook.site</a> untuk menguji inspeksi payload secara langsung.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="submit"
                disabled={savingWebhook}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-600 text-white font-semibold rounded-xl text-xs shadow-lg shadow-indigo-600/30 disabled:opacity-50 cursor-pointer"
              >
                {savingWebhook ? 'Menyimpan...' : 'Simpan URL Webhook'}
              </button>

              <button
                type="button"
                onClick={handleTestWebhook}
                disabled={testingWebhook || !webhookUrl}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs border border-slate-700 transition-colors disabled:opacity-40 cursor-pointer"
              >
                <Radio className={`w-3.5 h-3.5 ${testingWebhook ? 'animate-pulse text-indigo-400' : ''}`} />
                <span>{testingWebhook ? 'Menguji Koneksi...' : 'Test Webhook'}</span>
              </button>
            </div>
          </form>

          {/* Test Webhook Result Box */}
          {testResult && (
            <div
              className={`p-4 rounded-xl border text-xs space-y-1.5 ${
                testResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
              }`}
            >
              <div className="font-bold flex items-center gap-1.5">
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                )}
                <span>{testResult.success ? 'Uji Koneksi Berhasil' : 'Uji Koneksi Gagal'}</span>
              </div>
              <p>{testResult.message}</p>
              {testResult.latencyMs && (
                <p className="text-[11px] text-slate-400">
                  Waktu Respons Server: <strong>{testResult.latencyMs}ms</strong>
                </p>
              )}
            </div>
          )}

          {/* JSON Payload Spec Guide */}
          <div className="pt-2 border-t border-slate-800">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Format JSON Payload yang Dikirimkan:
            </span>
            <pre className="p-3 bg-slate-950 text-slate-300 rounded-xl text-[11px] font-mono overflow-x-auto leading-relaxed border border-slate-800">
{`{
  "event": "LOW_STOCK_ALERT",
  "sku": "KNT-002",
  "product_name": "Tinta Printer Universal Hitam",
  "current_stock": 4,
  "min_stock": 10,
  "unit": "botol",
  "timestamp": "2026-11-18T10:00:00.000Z"
}`}
            </pre>
          </div>
        </div>

        {/* Section 2: Manage Categories */}
        <div className="bg-slate-900/80 backdrop-blur-md p-6 rounded-2xl border border-slate-800/80 shadow-xl space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Kelola Kategori Produk</h2>
              <p className="text-xs text-slate-400">Pengelompokan jenis barang untuk filter dan pelaporan</p>
            </div>
          </div>

          {/* Add Category Form */}
          <form onSubmit={handleAddCategory} className="flex gap-2">
            <input
              type="text"
              required
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="Nama Kategori Baru (misal: Kemasan & Plastik)"
              className="flex-1 px-3.5 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={addingCategory}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold rounded-xl text-xs shadow-md shadow-purple-600/30 disabled:opacity-50 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{addingCategory ? 'Menyimpan...' : 'Tambah'}</span>
            </button>
          </form>

          {/* Categories List */}
          <div className="border border-slate-800 rounded-xl divide-y divide-slate-800 overflow-hidden">
            {categories.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">Belum ada kategori terdaftar</div>
            ) : (
              categories.map((c) => (
                <div key={c.id} className="p-3.5 flex items-center justify-between text-sm hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-400" />
                    <span className="font-semibold text-white">{c.name}</span>
                  </div>
                  <Badge variant="purple" size="sm">
                    Aktif
                  </Badge>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
