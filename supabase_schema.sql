-- ==============================================================================
-- FTTS & Availability Dashboard - Complete Database Schema & Storage Configuration
-- Project: ljwflhbaiszapocyqbqt
-- Run this script in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/ljwflhbaiszapocyqbqt/sql/new
-- ==============================================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 1. WE CENTRAL RECORDS TABLES (public.we and public.we_records)
-- ==============================================================================

-- 1A. TABLE: public.we (matches the table created in Supabase Dashboard)
CREATE TABLE IF NOT EXISTS public.we (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.we ADD COLUMN IF NOT EXISTS site_code TEXT DEFAULT '';
ALTER TABLE public.we ADD COLUMN IF NOT EXISTS "site code" TEXT DEFAULT '';
ALTER TABLE public.we ADD COLUMN IF NOT EXISTS "Exc Sectores" TEXT DEFAULT '';
ALTER TABLE public.we ADD COLUMN IF NOT EXISTS "Sectores" TEXT DEFAULT '';
ALTER TABLE public.we ADD COLUMN IF NOT EXISTS "Exc sector" TEXT DEFAULT '';
ALTER TABLE public.we ADD COLUMN IF NOT EXISTS "Sectore" TEXT DEFAULT '';
ALTER TABLE public.we ADD COLUMN IF NOT EXISTS "Exc Zone" TEXT DEFAULT '';
ALTER TABLE public.we ADD COLUMN IF NOT EXISTS "Zone" TEXT DEFAULT '';
ALTER TABLE public.we ADD COLUMN IF NOT EXISTS "السنترال" TEXT DEFAULT '';
ALTER TABLE public.we ADD COLUMN IF NOT EXISTS "اداره التنفيذ المختصه" TEXT DEFAULT '';
ALTER TABLE public.we ADD COLUMN IF NOT EXISTS "Type" TEXT DEFAULT '';
ALTER TABLE public.we ADD COLUMN IF NOT EXISTS "التصنيف" TEXT DEFAULT '';
ALTER TABLE public.we ADD COLUMN IF NOT EXISTS "اسباب التعذر" TEXT DEFAULT '';
ALTER TABLE public.we ADD COLUMN IF NOT EXISTS "الجهة المطلوب الدعم منها" TEXT DEFAULT '';
ALTER TABLE public.we ADD COLUMN IF NOT EXISTS "خطة" TEXT DEFAULT '';
ALTER TABLE public.we ADD COLUMN IF NOT EXISTS "مواقع تم اضافتها بتاريخ2" TEXT DEFAULT '';
ALTER TABLE public.we ADD COLUMN IF NOT EXISTS "Site Status" TEXT DEFAULT '';
ALTER TABLE public.we ADD COLUMN IF NOT EXISTS "التاريخ المتوقع للانتهاء" TEXT DEFAULT '';
ALTER TABLE public.we ADD COLUMN IF NOT EXISTS "التاريخ الفعلى للانتهاء" TEXT DEFAULT '';
ALTER TABLE public.we ADD COLUMN IF NOT EXISTS "NLongitude" TEXT DEFAULT '';
ALTER TABLE public.we ADD COLUMN IF NOT EXISTS "NLatitude" TEXT DEFAULT '';
ALTER TABLE public.we ADD COLUMN IF NOT EXISTS "المسافة كم" TEXT DEFAULT '';
ALTER TABLE public.we ADD COLUMN IF NOT EXISTS "تكلفة التوصيل بدون مسار تراسلى بالجنيه" TEXT DEFAULT '';
ALTER TABLE public.we ADD COLUMN IF NOT EXISTS "تكلفة التوصيل على المسار التراسلى بالجنيه" TEXT DEFAULT '';
ALTER TABLE public.we ADD COLUMN IF NOT EXISTS "المستند" TEXT DEFAULT '';
ALTER TABLE public.we ADD COLUMN IF NOT EXISTS "المسئولية" TEXT DEFAULT '';
ALTER TABLE public.we ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.we ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.we ADD COLUMN IF NOT EXISTS created_by TEXT DEFAULT 'user';

CREATE INDEX IF NOT EXISTS idx_we_site_code ON public.we(site_code);
CREATE INDEX IF NOT EXISTS idx_we_site_code_quoted ON public.we("site code");
CREATE INDEX IF NOT EXISTS idx_we_status ON public.we("Site Status");
CREATE INDEX IF NOT EXISTS idx_we_tasneef ON public.we("التصنيف");

-- Open full permissions for anonymous / public access on table public.we
ALTER TABLE public.we ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read we" ON public.we;
CREATE POLICY "Allow public read we" ON public.we FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert we" ON public.we;
CREATE POLICY "Allow public insert we" ON public.we FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update we" ON public.we;
CREATE POLICY "Allow public update we" ON public.we FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public delete we" ON public.we;
CREATE POLICY "Allow public delete we" ON public.we FOR DELETE USING (true);

-- 1B. TABLE: public.we_records (alias / legacy compatibility)
CREATE TABLE IF NOT EXISTS public.we_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_code TEXT NOT NULL DEFAULT '',
    "site code" TEXT NOT NULL DEFAULT '',
    "Exc Sectores" TEXT DEFAULT '',
    "Sectores" TEXT DEFAULT '',
    "Exc sector" TEXT DEFAULT '',
    "Sectore" TEXT DEFAULT '',
    "Exc Zone" TEXT DEFAULT '',
    "Zone" TEXT DEFAULT '',
    "السنترال" TEXT DEFAULT '',
    "اداره التنفيذ المختصه" TEXT DEFAULT '',
    "Type" TEXT DEFAULT '',
    "التصنيف" TEXT DEFAULT '',
    "اسباب التعذر" TEXT DEFAULT '',
    "الجهة المطلوب الدعم منها" TEXT DEFAULT '',
    "خطة" TEXT DEFAULT '',
    "مواقع تم اضافتها بتاريخ2" TEXT DEFAULT '',
    "Site Status" TEXT DEFAULT '',
    "التاريخ المتوقع للانتهاء" TEXT DEFAULT '',
    "التاريخ الفعلى للانتهاء" TEXT DEFAULT '',
    "NLongitude" TEXT DEFAULT '',
    "NLatitude" TEXT DEFAULT '',
    "المسافة كم" TEXT DEFAULT '',
    "تكلفة التوصيل بدون مسار تراسلى بالجنيه" TEXT DEFAULT '',
    "تكلفة التوصيل على المسار التراسلى بالجنيه" TEXT DEFAULT '',
    "المستند" TEXT DEFAULT '',
    "المسئولية" TEXT DEFAULT '',
    data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT DEFAULT 'user'
);

-- Indexes for WE Records
CREATE INDEX IF NOT EXISTS idx_we_records_site_code ON public.we_records(site_code);
CREATE INDEX IF NOT EXISTS idx_we_records_site_code_quoted ON public.we_records("site code");
CREATE INDEX IF NOT EXISTS idx_we_records_sectore ON public.we_records("Sectore");
CREATE INDEX IF NOT EXISTS idx_we_records_status ON public.we_records("Site Status");
CREATE INDEX IF NOT EXISTS idx_we_records_tasneef ON public.we_records("التصنيف");

-- RLS for WE Records
ALTER TABLE public.we_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read we_records" ON public.we_records;
CREATE POLICY "Allow public read we_records" ON public.we_records FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert we_records" ON public.we_records;
CREATE POLICY "Allow public insert we_records" ON public.we_records FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update we_records" ON public.we_records;
CREATE POLICY "Allow public update we_records" ON public.we_records FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public delete we_records" ON public.we_records;
CREATE POLICY "Allow public delete we_records" ON public.we_records FOR DELETE USING (true);

-- ==============================================================================
-- 2. VODAFONE RECORDS TABLE (public.vodafone_records)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.vodafone_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_code TEXT NOT NULL DEFAULT '',
    "site code" TEXT DEFAULT '',
    "Site code" TEXT DEFAULT '',
    " Site code" TEXT DEFAULT '',
    central TEXT DEFAULT '',
    sector TEXT DEFAULT '',
    general_admin TEXT DEFAULT '',
    competent_admin TEXT DEFAULT '',
    status TEXT DEFAULT '',
    classification TEXT DEFAULT '',
    "التصنيف" TEXT DEFAULT '',
    "الملاحظات" TEXT DEFAULT '',
    "مسئولية التنفيذ" TEXT DEFAULT '',
    "احدثيات خط الطول" TEXT DEFAULT '',
    "احدثيات خط العرض" TEXT DEFAULT '',
    data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT DEFAULT 'user'
);

-- Indexes for Vodafone Records
CREATE INDEX IF NOT EXISTS idx_vodafone_site_code ON public.vodafone_records(site_code);
CREATE INDEX IF NOT EXISTS idx_vodafone_sector ON public.vodafone_records(sector);

-- RLS for Vodafone Records
ALTER TABLE public.vodafone_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read vodafone_records" ON public.vodafone_records;
CREATE POLICY "Allow public read vodafone_records" ON public.vodafone_records FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert vodafone_records" ON public.vodafone_records;
CREATE POLICY "Allow public insert vodafone_records" ON public.vodafone_records FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update vodafone_records" ON public.vodafone_records;
CREATE POLICY "Allow public update vodafone_records" ON public.vodafone_records FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public delete vodafone_records" ON public.vodafone_records;
CREATE POLICY "Allow public delete vodafone_records" ON public.vodafone_records FOR DELETE USING (true);

-- ==============================================================================
-- 3. ORANGE RECORDS TABLE (public.orange_records)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.orange_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_code TEXT NOT NULL DEFAULT '',
    "site code" TEXT DEFAULT '',
    "Site code" TEXT DEFAULT '',
    " Site code" TEXT DEFAULT '',
    central TEXT DEFAULT '',
    sector TEXT DEFAULT '',
    general_admin TEXT DEFAULT '',
    competent_admin TEXT DEFAULT '',
    status TEXT DEFAULT '',
    classification TEXT DEFAULT '',
    "التصنيف" TEXT DEFAULT '',
    "الملاحظات" TEXT DEFAULT '',
    "مسئولية التنفيذ" TEXT DEFAULT '',
    "مستند الموقف" TEXT DEFAULT '',
    data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT DEFAULT 'user'
);

-- Indexes for Orange Records
CREATE INDEX IF NOT EXISTS idx_orange_site_code ON public.orange_records(site_code);
CREATE INDEX IF NOT EXISTS idx_orange_sector ON public.orange_records(sector);

-- RLS for Orange Records
ALTER TABLE public.orange_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read orange_records" ON public.orange_records;
CREATE POLICY "Allow public read orange_records" ON public.orange_records FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert orange_records" ON public.orange_records;
CREATE POLICY "Allow public insert orange_records" ON public.orange_records FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update orange_records" ON public.orange_records;
CREATE POLICY "Allow public update orange_records" ON public.orange_records FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public delete orange_records" ON public.orange_records;
CREATE POLICY "Allow public delete orange_records" ON public.orange_records FOR DELETE USING (true);

-- ==============================================================================
-- 4. AVAILABILITY & ETAHA RECORDS TABLE (public.etaha_records)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.etaha_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL DEFAULT '',
    client_name TEXT DEFAULT '',
    branch_name TEXT DEFAULT '',
    address TEXT DEFAULT '',
    sector TEXT DEFAULT '',
    governorate TEXT DEFAULT '',
    central TEXT DEFAULT '',
    status TEXT DEFAULT '',
    classification TEXT DEFAULT '',
    "التصنيف" TEXT DEFAULT '',
    "اسم العميل" TEXT DEFAULT '',
    "اسم الفرع" TEXT DEFAULT '',
    "العنوان" TEXT DEFAULT '',
    "المحافظة" TEXT DEFAULT '',
    "سنترال الربط" TEXT DEFAULT '',
    project_type TEXT DEFAULT 'إتاحة',
    data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT DEFAULT 'user'
);

-- Indexes for Etaha Records
CREATE INDEX IF NOT EXISTS idx_etaha_code ON public.etaha_records(code);
CREATE INDEX IF NOT EXISTS idx_etaha_sector ON public.etaha_records(sector);
CREATE INDEX IF NOT EXISTS idx_etaha_project_type ON public.etaha_records(project_type);

-- RLS for Etaha Records
ALTER TABLE public.etaha_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read etaha_records" ON public.etaha_records;
CREATE POLICY "Allow public read etaha_records" ON public.etaha_records FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert etaha_records" ON public.etaha_records;
CREATE POLICY "Allow public insert etaha_records" ON public.etaha_records FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update etaha_records" ON public.etaha_records FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public delete etaha_records" ON public.etaha_records FOR DELETE USING (true);

-- ==============================================================================
-- 5. UPLOADED CUSTOM DATASETS TABLE (public.uploaded_datasets)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.uploaded_datasets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_name TEXT NOT NULL,
    sheet_name TEXT DEFAULT '',
    total_rows INT DEFAULT 0,
    scope TEXT DEFAULT 'CUSTOM',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT DEFAULT 'user'
);

ALTER TABLE public.uploaded_datasets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read uploaded_datasets" ON public.uploaded_datasets;
CREATE POLICY "Allow public read uploaded_datasets" ON public.uploaded_datasets FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert uploaded_datasets" ON public.uploaded_datasets;
CREATE POLICY "Allow public insert uploaded_datasets" ON public.uploaded_datasets FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update uploaded_datasets" ON public.uploaded_datasets;
CREATE POLICY "Allow public update uploaded_datasets" ON public.uploaded_datasets FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public delete uploaded_datasets" ON public.uploaded_datasets;
CREATE POLICY "Allow public delete uploaded_datasets" ON public.uploaded_datasets FOR DELETE USING (true);

-- ==============================================================================
-- 6. STORAGE BUCKETS CONFIGURATION (public storage for documents & attachments)
-- ==============================================================================

-- Create buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('site-attachments', 'site-attachments', true, 52428800, null),
    ('excel-uploads', 'excel-uploads', true, 52428800, null)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage Objects Policies
DROP POLICY IF EXISTS "Allow Public Read Storage" ON storage.objects;
CREATE POLICY "Allow Public Read Storage" ON storage.objects
    FOR SELECT USING (bucket_id IN ('site-attachments', 'excel-uploads'));

DROP POLICY IF EXISTS "Allow Public Insert Storage" ON storage.objects;
CREATE POLICY "Allow Public Insert Storage" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id IN ('site-attachments', 'excel-uploads'));

DROP POLICY IF EXISTS "Allow Public Update Storage" ON storage.objects;
CREATE POLICY "Allow Public Update Storage" ON storage.objects
    FOR UPDATE USING (bucket_id IN ('site-attachments', 'excel-uploads'));

DROP POLICY IF EXISTS "Allow Public Delete Storage" ON storage.objects;
CREATE POLICY "Allow Public Delete Storage" ON storage.objects
    FOR DELETE USING (bucket_id IN ('site-attachments', 'excel-uploads'));

-- ==============================================================================
-- 7. SPECIAL TARGET SUPPORT (Mobile & Availability Projects)
-- ==============================================================================
ALTER TABLE public.we ADD COLUMN IF NOT EXISTS special_target BOOLEAN DEFAULT false;
ALTER TABLE public.we_records ADD COLUMN IF NOT EXISTS special_target BOOLEAN DEFAULT false;
ALTER TABLE public.vodafone_records ADD COLUMN IF NOT EXISTS special_target BOOLEAN DEFAULT false;
ALTER TABLE public.orange_records ADD COLUMN IF NOT EXISTS special_target BOOLEAN DEFAULT false;
ALTER TABLE public.etaha_records ADD COLUMN IF NOT EXISTS special_target BOOLEAN DEFAULT false;

-- ==============================================================================
-- Schema configuration completed successfully!
-- ==============================================================================
