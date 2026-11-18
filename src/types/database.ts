export type UserRole = 'ADMIN' | 'STAFF';
export type TransactionType = 'IN' | 'OUT' | 'ADJUSTMENT';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  created_at: string;
}

export interface Product {
  id: string;
  category_id: string | null;
  sku: string;
  name: string;
  unit: string;
  cost_price?: number | null; // Hidden from STAFF role
  selling_price: number;
  current_stock: number;
  min_stock: number;
  is_active: boolean;
  updated_at: string;
  categories?: {
    id: string;
    name: string;
  } | null;
}

export interface StockTransaction {
  id: string;
  product_id: string;
  user_id: string;
  type: TransactionType;
  quantity: number;
  previous_stock: number;
  new_stock: number;
  reference_note: string | null;
  created_at: string;
  products?: {
    id: string;
    sku: string;
    name: string;
    unit: string;
  } | null;
  profiles?: {
    id: string;
    full_name: string;
    email: string;
    role: UserRole;
  } | null;
}

export interface AppSetting {
  key: string;
  value: string;
}

export interface DashboardSummary {
  totalActiveSkus: number;
  totalPhysicalUnits: number;
  inventoryValuation: number | null; // null if role is STAFF
  lowStockCount: number;
  lowStockItems: Array<{
    id: string;
    sku: string;
    name: string;
    current_stock: number;
    min_stock: number;
    unit: string;
    category_name?: string;
  }>;
  chartData: Array<{
    date: string; // e.g. "12/11" or "Sen", "Sel"
    barangMasuk: number;
    barangKeluar: number;
  }>;
}

export interface StockLedgerItem {
  sku: string;
  name: string;
  unit: string;
  openingStock: number;
  totalIn: number;
  totalOut: number;
  adjustments: number;
  closingStock: number;
  costPrice: number;
  valuation: number;
}

export interface ProcessTransactionRpcResponse {
  transaction_id: string;
  sku: string;
  product_name: string;
  previous_stock: number;
  new_stock: number;
  min_stock: number;
  unit: string;
}
