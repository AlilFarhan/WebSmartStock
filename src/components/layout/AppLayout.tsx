'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  ArrowLeftRight,
  FileSpreadsheet,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Boxes,
  ShieldCheck,
  User,
  Bell,
  Search,
  Plus,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  QrCode,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import type { UserRole, Product } from '@/types/database';

interface AppLayoutProps {
  children: React.ReactNode;
}

interface CurrentUserInfo {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
}

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'warning' | 'info' | 'success';
}

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUserInfo | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Notification Center
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Global Quick SKU Search / Jump Modal
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);

  // Quick Global Transaction Modal
  const [isQuickTxOpen, setIsQuickTxOpen] = useState(false);
  const [quickTxProdId, setQuickTxProdId] = useState('');
  const [quickTxType, setQuickTxType] = useState<'IN' | 'OUT'>('IN');
  const [quickTxAmount, setQuickTxAmount] = useState(1);
  const [quickTxNote, setQuickTxNote] = useState('');
  const [quickTxProducts, setQuickTxProducts] = useState<Product[]>([]);
  const [quickTxSubmitting, setQuickTxSubmitting] = useState(false);

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setCurrentUser(data.user);
          }
        }
      } catch (err) {
        console.error('Failed to load user info:', err);
      }
    }
    loadUser();
  }, []);

  // Fetch low stock items to populate live notification center
  useEffect(() => {
    async function fetchNotifications() {
      try {
        const res = await fetch('/api/dashboard/summary');
        if (res.ok) {
          const json = await res.json();
          const items: NotificationItem[] = [];

          if (json.lowStockItems && json.lowStockItems.length > 0) {
            json.lowStockItems.forEach((p: any) => {
              items.push({
                id: p.id,
                title: p.current_stock === 0 ? 'Stok Habis!' : 'Stok Menipis',
                message: `${p.name} (${p.sku}) tersisa ${p.current_stock} ${p.unit} (Min: ${p.min_stock})`,
                time: 'Perlu Restock Segera',
                type: p.current_stock === 0 ? 'warning' : 'info',
              });
            });
          }

          items.push({
            id: 'sync-status',
            title: 'Sistem Terhubung',
            message: 'Database Supabase PostgreSQL & Auth aktif',
            time: 'Realtime',
            type: 'success',
          });

          setNotifications(items);
        }
      } catch (e) {
        console.error(e);
      }
    }
    fetchNotifications();
  }, []);

  // Close notifications dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut Ctrl+K or Cmd+K to open Quick Search
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchModalOpen(true);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Search logic for Quick Search Modal
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/products?search=${encodeURIComponent(searchQuery)}&limit=6`);
        if (res.ok) {
          const json = await res.json();
          setSearchResults(json.data || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load products list when quick tx modal is opened
  const openQuickTxModal = async () => {
    setIsQuickTxOpen(true);
    try {
      const res = await fetch('/api/products?limit=100&status=ALL');
      if (res.ok) {
        const json = await res.json();
        setQuickTxProducts(json.data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleQuickTxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTxProdId) return;
    setQuickTxSubmitting(true);
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: quickTxProdId,
          type: quickTxType,
          amount: Number(quickTxAmount),
          referenceNote: quickTxNote || `Mutasi cepat (${quickTxType}) dari navigasi utama`,
        }),
      });
      if (res.ok) {
        setIsQuickTxOpen(false);
        setQuickTxAmount(1);
        setQuickTxNote('');
        router.refresh();
      } else {
        const json = await res.json();
        alert(json.error || 'Gagal memproses mutasi');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setQuickTxSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    setIsLoggingOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error('Error signing out:', err);
      setIsLoggingOut(false);
    }
  };

  const navItems = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/products', label: 'Master Produk', icon: Package },
    { href: '/transactions', label: 'Riwayat & Opname', icon: ArrowLeftRight },
    { href: '/reports', label: 'Laporan & Ekspor', icon: FileSpreadsheet },
    ...(currentUser?.role === 'ADMIN'
      ? [{ href: '/settings', label: 'Pengaturan', icon: Settings }]
      : []),
  ];

  const warningCount = notifications.filter((n) => n.type === 'warning' || n.type === 'info').length;

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-900 text-slate-100 relative overflow-hidden">
      {/* Dynamic Ambient Background Decorative Elements */}
      <div className="fixed inset-0 bg-slate-950 -z-10" />
      <div className="fixed inset-0 bg-grid-pattern opacity-40 -z-10 pointer-events-none" />
      
      {/* Glowing Ambient Gradient Orbs */}
      <div className="fixed -top-40 -left-40 w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse duration-1000" />
      <div className="fixed top-1/3 -right-40 w-[600px] h-[600px] bg-purple-600/15 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="fixed -bottom-40 left-1/3 w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none -z-10" />

      {/* Mobile Topbar */}
      <header className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <span className="font-extrabold text-lg text-white tracking-tight">SmartStock</span>
            <span className="block text-[10px] font-semibold text-indigo-400 -mt-1 tracking-wider uppercase">Pro Inventory</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Search Trigger */}
          <button
            onClick={() => setIsSearchModalOpen(true)}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
            title="Cari Produk"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div 
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)} 
          />
          <div className="relative w-4/5 max-w-xs bg-slate-900 border-r border-slate-800 h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                  <Boxes className="w-4 h-4" />
                </div>
                <span className="font-bold text-base text-white">SmartStock</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile Nav Links */}
            <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-600/30 font-semibold'
                        : 'text-slate-400 hover:bg-slate-800/80 hover:text-white'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Mobile User Profile Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/50">
              {currentUser && (
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold text-white truncate">{currentUser.full_name}</p>
                    <Badge variant={currentUser.role === 'ADMIN' ? 'purple' : 'blue'}>
                      {currentUser.role}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-400 truncate">{currentUser.email}</p>
                </div>
              )}
              <button
                onClick={handleSignOut}
                disabled={isLoggingOut}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>{isLoggingOut ? 'Keluar...' : 'Keluar'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Collapsible Sidebar */}
      <aside
        className={`hidden md:flex flex-col bg-slate-900/90 backdrop-blur-xl border-r border-slate-800/80 transition-all duration-300 relative z-30 shrink-0 ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Sidebar Header Brand */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800/80">
          <div className={`flex items-center gap-3 overflow-hidden ${isCollapsed ? 'justify-center w-full' : ''}`}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 shrink-0">
              <Boxes className="w-5 h-5" />
            </div>
            {!isCollapsed && (
              <div className="leading-tight truncate">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-white text-lg tracking-tight">SmartStock</span>
                  <span className="px-1.5 py-0.2 bg-indigo-500/20 text-indigo-400 text-[9px] font-bold rounded uppercase tracking-wider border border-indigo-500/30">
                    Pro
                  </span>
                </div>
                <span className="block text-[11px] font-medium text-slate-400">
                  Inventory System
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Quick Mutasi Action Button */}
        {!isCollapsed && (
          <div className="p-3">
            <button
              onClick={openQuickTxModal}
              className="w-full py-2.5 px-3 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-600 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition-all group cursor-pointer"
            >
              <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
              <span>Input Mutasi Stok</span>
            </button>
          </div>
        )}

        {/* Sidebar Navigation */}
        <div className="flex-1 py-2 px-3 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={isCollapsed ? item.label : undefined}
                className={`flex items-center gap-3.5 px-3.5 py-3 rounded-xl font-medium text-sm transition-all group ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-600/30 font-semibold'
                    : 'text-slate-400 hover:bg-slate-800/70 hover:text-white'
                } ${isCollapsed ? 'justify-center px-0' : ''}`}
              >
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-400'}`} />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </div>

        {/* Desktop Collapse Toggle */}
        <div className="p-3 border-t border-slate-800/80 flex justify-end">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors w-full flex items-center justify-center gap-2 text-xs font-medium"
            title={isCollapsed ? 'Perluas Sidebar' : 'Ciutkan Sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4" />
                <span>Ciutkan</span>
              </>
            )}
          </button>
        </div>

        {/* Sidebar User Info & Sign Out Footer */}
        <div className="p-3 bg-slate-950/60 border-t border-slate-800/80">
          {!isCollapsed && currentUser ? (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-md">
                  {currentUser.full_name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div className="overflow-hidden leading-tight flex-1">
                  <p className="text-xs font-bold text-white truncate">{currentUser.full_name}</p>
                  <p className="text-[11px] text-slate-400 truncate">{currentUser.email}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <Badge variant={currentUser.role === 'ADMIN' ? 'purple' : 'blue'}>
                  {currentUser.role === 'ADMIN' ? (
                    <span className="flex items-center gap-1 font-bold">
                      <ShieldCheck className="w-3 h-3 text-purple-400" /> ADMIN
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 font-bold">
                      <User className="w-3 h-3 text-blue-400" /> STAFF
                    </span>
                  )}
                </Badge>
                <button
                  onClick={handleSignOut}
                  disabled={isLoggingOut}
                  className="text-xs font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{isLoggingOut ? '...' : 'Keluar'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <button
                onClick={handleSignOut}
                disabled={isLoggingOut}
                className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                title="Keluar"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Desktop Top Header Bar with Notifications, Search and Status */}
        <header className="hidden md:flex h-16 items-center justify-between px-6 bg-slate-900/60 backdrop-blur-md border-b border-slate-800/80 sticky top-0 z-20">
          {/* Quick Search Bar Trigger */}
          <button
            onClick={() => setIsSearchModalOpen(true)}
            className="flex items-center gap-2.5 px-3.5 py-1.5 bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/80 rounded-xl text-xs transition-all w-72 shadow-inner"
          >
            <Search className="w-4 h-4 text-slate-400" />
            <span className="flex-1 text-left">Cari cepat SKU atau Produk...</span>
            <kbd className="px-1.5 py-0.5 bg-slate-900 rounded text-[10px] font-mono border border-slate-700 text-slate-400">Ctrl K</kbd>
          </button>

          {/* Top Right Actions */}
          <div className="flex items-center gap-4">
            {/* Live Status indicator */}
            <div className="flex items-center gap-2 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
              <span>PostgreSQL & Auth Connected</span>
            </div>

            {/* Notification Center */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="relative p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                title="Pusat Notifikasi Stok"
              >
                <Bell className="w-5 h-5" />
                {warningCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                    {warningCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown Panel */}
              {isNotifOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-indigo-400" />
                      <h4 className="text-sm font-bold text-white">Notifikasi Inventaris</h4>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-400">
                      {warningCount} Perlu Perhatian
                    </span>
                  </div>

                  <div className="py-2 space-y-2 max-h-72 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-4">Semua kondisi inventaris normal</p>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 transition-colors ${
                            n.type === 'warning'
                              ? 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                              : n.type === 'info'
                              ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                          }`}
                        >
                          {n.type === 'warning' && <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />}
                          {n.type === 'info' && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />}
                          {n.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />}
                          <div className="flex-1">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-white">{n.title}</span>
                              <span className="text-[10px] text-slate-400">{n.time}</span>
                            </div>
                            <p className="text-[11px] text-slate-300 mt-0.5">{n.message}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Main Content Area */}
        <main className="flex-1 min-w-0 pb-16 md:pb-6 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </div>
        </main>
      </div>

      {/* Quick Search Modal (Ctrl + K) */}
      <Modal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        title="Pencarian Cepat SKU & Produk"
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ketik SKU (misal: ELK-001) atau nama barang..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {searching && (
              <p className="text-xs text-slate-400 text-center py-4">Mencari katalog...</p>
            )}

            {!searching && searchResults.length === 0 && searchQuery && (
              <p className="text-xs text-slate-400 text-center py-4">Tidak ada produk yang cocok dengan &quot;{searchQuery}&quot;</p>
            )}

            {searchResults.map((p) => (
              <div
                key={p.id}
                onClick={() => {
                  setIsSearchModalOpen(false);
                  router.push(`/products`);
                }}
                className="p-3 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 rounded-xl flex items-center justify-between cursor-pointer transition-colors"
              >
                <div>
                  <div className="font-bold text-white text-sm">{p.name}</div>
                  <div className="text-xs text-indigo-400 font-mono mt-0.5">{p.sku} &bull; {p.categories?.name || 'Tanpa Kategori'}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-white text-sm">{p.current_stock} {p.unit}</div>
                  <span className={`text-[10px] font-semibold ${p.current_stock <= p.min_stock ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {p.current_stock <= p.min_stock ? 'Perlu Restock' : 'Aman'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* Quick Global Mutasi Modal */}
      <Modal
        isOpen={isQuickTxOpen}
        onClose={() => setIsQuickTxOpen(false)}
        title="Input Cepat Mutasi Inventaris"
      >
        <form onSubmit={handleQuickTxSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase mb-1">Tipe Mutasi</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setQuickTxType('IN')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  quickTxType === 'IN'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <ArrowDownLeft className="w-4 h-4" /> Barang Masuk (+IN)
              </button>
              <button
                type="button"
                onClick={() => setQuickTxType('OUT')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  quickTxType === 'OUT'
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <ArrowUpRight className="w-4 h-4" /> Barang Keluar (-OUT)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Pilih Produk</label>
            <select
              required
              value={quickTxProdId}
              onChange={(e) => setQuickTxProdId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="">-- Pilih Barang --</option>
              {quickTxProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.sku}] {p.name} (Stok: {p.current_stock} {p.unit})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Jumlah</label>
            <input
              type="number"
              min="1"
              required
              value={quickTxAmount}
              onChange={(e) => setQuickTxAmount(parseInt(e.target.value, 10) || 1)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Referensi / Catatan</label>
            <input
              type="text"
              value={quickTxNote}
              onChange={(e) => setQuickTxNote(e.target.value)}
              placeholder="Contoh: Restock darurat, penjualan kasir #1"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsQuickTxOpen(false)}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-100"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={quickTxSubmitting || !quickTxProdId}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-600/20 disabled:opacity-50"
            >
              {quickTxSubmitting ? 'Memproses...' : 'Simpan Mutasi'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Mobile Bottom Thumb Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-2 py-1.5 flex justify-around shadow-2xl">
        {navItems.slice(0, 4).map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center py-1 px-3 rounded-lg text-xs font-medium transition-colors ${
                isActive ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span className="text-[10px]">{item.label.split(' ')[0]}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
