-- ==============================================================================
-- SmartStock: Production Supabase Schema & RPC
-- PostgreSQL + Row Level Security (RLS) + Atomic Transactions
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUMS
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('ADMIN', 'STAFF');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE transaction_type AS ENUM ('IN', 'OUT', 'ADJUSTMENT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. PROFILES TABLE (Linked with auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'STAFF',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to auto-create profile row on user registration in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_role user_role := 'STAFF';
    v_full_name TEXT;
BEGIN
    IF (new.raw_user_meta_data->>'role') = 'ADMIN' THEN
        v_role := 'ADMIN';
    END IF;

    v_full_name := COALESCE(
        new.raw_user_meta_data->>'full_name',
        split_part(new.email, '@', 1)
    );

    INSERT INTO public.profiles (id, full_name, email, role, created_at)
    VALUES (new.id, v_full_name, new.email, v_role, NOW())
    ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        email = EXCLUDED.email;

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    sku TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    unit TEXT NOT NULL, -- pcs, dus, kg, pack, liter, etc.
    cost_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    current_stock INTEGER NOT NULL DEFAULT 0,
    min_stock INTEGER NOT NULL DEFAULT 5,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);
CREATE INDEX IF NOT EXISTS idx_products_name ON public.products(name);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products(is_active);

-- 6. STOCK TRANSACTIONS TABLE (Audit Trail / Kartu Stok)
CREATE TABLE IF NOT EXISTS public.stock_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    type transaction_type NOT NULL,
    quantity INTEGER NOT NULL, -- positive for IN, negative for OUT, delta for ADJUSTMENT
    previous_stock INTEGER NOT NULL,
    new_stock INTEGER NOT NULL,
    reference_note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_tx_product ON public.stock_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_tx_created ON public.stock_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_tx_type ON public.stock_transactions(type);

-- 7. APP SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- 8. HELPER SECURITY FUNCTION (is_admin)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'ADMIN'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 9. ATOMIC POSTGRESQL RPC FUNCTION: process_stock_transaction
CREATE OR REPLACE FUNCTION public.process_stock_transaction(
    p_product_id UUID,
    p_user_id UUID,
    p_type transaction_type,
    p_amount INTEGER,
    p_note TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_product RECORD;
    v_prev_stock INTEGER;
    v_new_stock INTEGER;
    v_delta INTEGER;
    v_transaction_id UUID;
BEGIN
    -- 1. Explicit row locking with FOR UPDATE to prevent race conditions
    SELECT * INTO v_product
    FROM public.products
    WHERE id = p_product_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Product with ID % not found', p_product_id;
    END IF;

    IF NOT v_product.is_active THEN
        RAISE EXCEPTION 'Cannot perform transactions on inactive product %', v_product.sku;
    END IF;

    v_prev_stock := v_product.current_stock;

    -- 2. Business logic based on transaction type
    IF p_type = 'IN' THEN
        IF p_amount <= 0 THEN
            RAISE EXCEPTION 'Quantity for IN transaction must be strictly greater than 0';
        END IF;
        v_delta := p_amount;
        v_new_stock := v_prev_stock + p_amount;

    ELSIF p_type = 'OUT' THEN
        IF p_amount <= 0 THEN
            RAISE EXCEPTION 'Quantity for OUT transaction must be strictly greater than 0';
        END IF;
        v_new_stock := v_prev_stock - p_amount;
        IF v_new_stock < 0 THEN
            RAISE EXCEPTION 'Insufficient stock. Stok saat ini: %, permintaan keluar: %', v_prev_stock, p_amount;
        END IF;
        v_delta := -p_amount;

    ELSIF p_type = 'ADJUSTMENT' THEN
        IF p_amount < 0 THEN
            RAISE EXCEPTION 'Physical counted stock cannot be negative';
        END IF;
        v_new_stock := p_amount;
        v_delta := p_amount - v_prev_stock;

    ELSE
        RAISE EXCEPTION 'Invalid transaction type: %', p_type;
    END IF;

    -- 3. Update products stock
    UPDATE public.products
    SET current_stock = v_new_stock,
        updated_at = NOW()
    WHERE id = p_product_id;

    -- 4. Insert audit trail transaction
    INSERT INTO public.stock_transactions (
        product_id,
        user_id,
        type,
        quantity,
        previous_stock,
        new_stock,
        reference_note,
        created_at
    ) VALUES (
        p_product_id,
        p_user_id,
        p_type,
        v_delta,
        v_prev_stock,
        v_new_stock,
        p_note,
        NOW()
    ) RETURNING id INTO v_transaction_id;

    -- 5. Return JSON summary
    RETURN jsonb_build_object(
        'transaction_id', v_transaction_id,
        'sku', v_product.sku,
        'product_name', v_product.name,
        'previous_stock', v_prev_stock,
        'new_stock', v_new_stock,
        'min_stock', v_product.min_stock,
        'unit', v_product.unit
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. ROW LEVEL SECURITY (RLS) POLICIES

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Profiles: Authenticated users can read all profiles; users can update own profile, Admins can manage
DROP POLICY IF EXISTS "Allow authenticated users to read profiles" ON public.profiles;
CREATE POLICY "Allow authenticated users to read profiles"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow users to update own profile" ON public.profiles;
CREATE POLICY "Allow users to update own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

-- Categories: Read for all authenticated; write for ADMIN only
DROP POLICY IF EXISTS "Allow authenticated to read categories" ON public.categories;
CREATE POLICY "Allow authenticated to read categories"
    ON public.categories FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow admin to manage categories" ON public.categories;
CREATE POLICY "Allow admin to manage categories"
    ON public.categories FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Products: Read for all authenticated; write for ADMIN only
DROP POLICY IF EXISTS "Allow authenticated to read products" ON public.products;
CREATE POLICY "Allow authenticated to read products"
    ON public.products FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow admin to manage products" ON public.products;
CREATE POLICY "Allow admin to manage products"
    ON public.products FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Stock Transactions: Read for all authenticated; insert for authenticated; update/delete restricted to ADMIN
DROP POLICY IF EXISTS "Allow authenticated to read stock_transactions" ON public.stock_transactions;
CREATE POLICY "Allow authenticated to read stock_transactions"
    ON public.stock_transactions FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow authenticated to insert stock_transactions" ON public.stock_transactions;
CREATE POLICY "Allow authenticated to insert stock_transactions"
    ON public.stock_transactions FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- App Settings: Read for authenticated; write for ADMIN only
DROP POLICY IF EXISTS "Allow authenticated to read app_settings" ON public.app_settings;
CREATE POLICY "Allow authenticated to read app_settings"
    ON public.app_settings FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow admin to manage app_settings" ON public.app_settings;
CREATE POLICY "Allow admin to manage app_settings"
    ON public.app_settings FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 11. SAMPLE SEED DATA
DO $$
DECLARE
    cat_elektronik UUID := gen_random_uuid();
    cat_material UUID := gen_random_uuid();
    cat_kantor UUID := gen_random_uuid();
BEGIN
    -- Insert Categories if not exist (without RETURNING INTO to prevent multi-row error)
    INSERT INTO public.categories (id, name)
    VALUES 
        (cat_elektronik, 'Elektronik & Aksesoris'),
        (cat_material, 'Bahan Baku & Material'),
        (cat_kantor, 'Peralatan Kantor')
    ON CONFLICT (name) DO NOTHING;

    -- Fetch exact category IDs with LIMIT 1
    SELECT id INTO cat_elektronik FROM public.categories WHERE name = 'Elektronik & Aksesoris' LIMIT 1;
    SELECT id INTO cat_material FROM public.categories WHERE name = 'Bahan Baku & Material' LIMIT 1;
    SELECT id INTO cat_kantor FROM public.categories WHERE name = 'Peralatan Kantor' LIMIT 1;

    -- Insert 5 Sample Products with safe, low, and out of stock levels
    INSERT INTO public.products (category_id, sku, name, unit, cost_price, selling_price, current_stock, min_stock, is_active)
    VALUES
        (cat_elektronik, 'ELK-001', 'Kabel Data USB Type-C 100W Fast Charging', 'pcs', 25000, 45000, 120, 20, TRUE),
        (cat_kantor, 'KNT-002', 'Tinta Printer Universal Hitam 100ml', 'botol', 18000, 32000, 4, 10, TRUE),
        (cat_kantor, 'KNT-003', 'Kertas HVS A4 80 GSM 1 Rim (500 Lembar)', 'rim', 42000, 58000, 0, 15, TRUE),
        (cat_elektronik, 'ELK-004', 'Mouse Wireless Silent Click 2.4GHz', 'pcs', 65000, 110000, 42, 10, TRUE),
        (cat_material, 'MAT-005', 'Lakban Bening Heavy Duty 48mm x 90m', 'roll', 9500, 16000, 8, 25, TRUE)
    ON CONFLICT (sku) DO NOTHING;

    -- Default App Setting for Webhook
    INSERT INTO public.app_settings (key, value)
    VALUES ('LOW_STOCK_WEBHOOK_URL', 'https://webhook.site/placeholder-url')
    ON CONFLICT (key) DO NOTHING;
END $$;
