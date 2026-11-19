'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Boxes, Lock, Mail, AlertCircle, ArrowRight, CheckCircle2, ArrowLeft, KeyRound } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  
  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Forgot Password State
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotErrorMsg, setForgotErrorMsg] = useState<string | null>(null);

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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotErrorMsg(null);
    setForgotLoading(true);

    try {
      const supabase = createClient();
      const redirectUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/auth/callback?next=/reset-password`
        : 'http://localhost:3000/auth/callback?next=/reset-password';

      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
        redirectTo: redirectUrl,
      });

      if (error) {
        if (error.message.toLowerCase().includes('rate limit')) {
          setForgotErrorMsg('Terlalu banyak permintaan reset. Silakan tunggu beberapa menit sebelum mencoba lagi.');
        } else {
          setForgotErrorMsg(error.message || 'Gagal mengirim email reset kata sandi.');
        }
        setForgotLoading(false);
        return;
      }

      setForgotSuccess(true);
    } catch (err: any) {
      setForgotErrorMsg(err.message || 'Terjadi kesalahan saat memproses permintaan.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden text-slate-100">
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

        {/* Card Form */}
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

          {isForgotMode ? (
            /* ==========================================
               MODE: LUPA KATA SANDI
            ========================================== */
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center gap-2.5 pb-2 border-b border-slate-700/60">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Lupa Kata Sandi</h2>
                  <p className="text-[11px] text-slate-400">Kirim instruksi pemulihan ke email Anda</p>
                </div>
              </div>

              {forgotSuccess ? (
                <div className="py-4 space-y-4">
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs leading-relaxed flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-bold text-emerald-200 mb-1">Tautan Pemulihan Terkirim!</strong>
                      Kami telah mengirimkan tautan reset kata sandi ke <strong className="text-white">{forgotEmail}</strong>. Silakan periksa kotak masuk (inbox) atau folder spam email Anda untuk membuat sandi baru.
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotMode(false);
                      setForgotSuccess(false);
                      setForgotEmail('');
                    }}
                    className="w-full py-2.5 px-4 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Kembali ke Halaman Masuk</span>
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Masukkan alamat email akun SmartStock Anda. Kami akan mengirimkan tautan aman untuk mengatur ulang kata sandi Anda.
                  </p>

                  {forgotErrorMsg && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-2.5 text-rose-400 text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{forgotErrorMsg}</span>
                    </div>
                  )}

                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                        Alamat Email Akun
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <Mail className="w-4 h-4" />
                        </div>
                        <input
                          type="email"
                          required
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          placeholder="nama@perusahaan.com"
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-sm shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {forgotLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Mengirim Tautan...</span>
                        </>
                      ) : (
                        <>
                          <span>Kirim Tautan Reset Sandi</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>

                    <div className="pt-2 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setIsForgotMode(false);
                          setForgotErrorMsg(null);
                        }}
                        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Batal &amp; Kembali ke Halaman Masuk</span>
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          ) : (
            /* ==========================================
               MODE: LOGIN UTAMA
            ========================================== */
            <>
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
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Kata Sandi
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotEmail(email);
                        setIsForgotMode(true);
                        setForgotSuccess(false);
                        setForgotErrorMsg(null);
                      }}
                      className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                    >
                      Lupa kata sandi?
                    </button>
                  </div>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
