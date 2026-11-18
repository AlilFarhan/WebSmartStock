'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Boxes, Lock, Mail, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isConfigured = 
    process.env.NEXT_PUBLIC_SUPABASE_URL && 
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id') &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    if (!isConfigured) {
      setErrorMsg('Koneksi belum terkonfigurasi: Berkas .env.local masih menggunakan nilai placeholder. Silakan masukkan NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY dari Supabase Dashboard Anda.');
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        if (error.message.toLowerCase().includes('failed to fetch')) {
          setErrorMsg('Gagal terhubung ke Supabase (Failed to fetch). Periksa koneksi internet Anda atau pastikan NEXT_PUBLIC_SUPABASE_URL di .env.local sudah benar.');
        } else if (error.message === 'Invalid login credentials') {
          setErrorMsg('Email atau kata sandi tidak sesuai. Pastikan Anda sudah membuat user di Supabase Auth.');
        } else {
          setErrorMsg(error.message);
        }
        setLoading(false);
        return;
      }

      if (data.user) {
        router.push('/');
        router.refresh();
      }
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.toLowerCase().includes('failed to fetch')) {
        setErrorMsg('Gagal terhubung ke Supabase (Failed to fetch). Pastikan NEXT_PUBLIC_SUPABASE_URL di berkas .env.local sudah sesuai dengan URL project Supabase Anda.');
      } else {
        setErrorMsg(msg || 'Terjadi kesalahan sistem');
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Glow Accents */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        {/* Brand Header */}
        <div className="text-center">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-indigo-600 items-center justify-center text-white shadow-xl shadow-indigo-500/20 mb-4">
            <Boxes className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">SmartStock</h1>
          <p className="mt-2 text-sm text-slate-400">
            Sistem Manajemen Inventaris & Kartu Stok Berbasis Cloud
          </p>
        </div>

        {/* Login Card */}
        <div className="mt-8 bg-slate-800/90 border border-slate-700/80 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-md">
          {!isConfigured && (
            <div className="mb-5 p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3 text-amber-300 text-xs leading-relaxed">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-400" />
              <div>
                <strong className="block font-semibold text-amber-200 mb-0.5">Konfigurasi Supabase Belum Lengkap:</strong>
                Nilai di berkas <code className="bg-slate-900 px-1 py-0.5 rounded text-amber-200">.env.local</code> masih placeholder. Silakan salin Project URL dan Anon Key dari Supabase Dashboard (Project Settings &gt; API).
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-3 text-rose-400 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Alamat Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@smartstock.local"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Kata Sandi
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-sm shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Memverifikasi...</span>
                </>
              ) : (
                <>
                  <span>Masuk ke Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Setup / RBAC Info */}
          <div className="mt-6 pt-5 border-t border-slate-700/60 text-xs text-slate-400">
            <p className="font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Hak Akses Multi-Level (RBAC):
            </p>
            <ul className="space-y-1 list-disc list-inside text-slate-400 text-[11px] leading-relaxed">
              <li><strong className="text-slate-300">ADMIN:</strong> Akses penuh (valuasi aset, CRUD master produk, ekspor, pengaturan).</li>
              <li><strong className="text-slate-300">STAFF:</strong> Operasional gudang (input transaksi masuk/keluar, stock opname).</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
