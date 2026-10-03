-- ============================================================================
-- MIGRATION V2: Sistem Penilaian Kru — Upgrade ke 11 Aspek + Matriks Asesor
-- ============================================================================
-- Jalankan script ini di Supabase SQL Editor (https://supabase.com/dashboard)
-- PENTING: Backup database terlebih dahulu sebelum menjalankan!
-- ============================================================================

-- ============================================================================
-- STEP 1: Tambah kolom area_type ke tabel outlets
-- ============================================================================
ALTER TABLE outlets 
ADD COLUMN IF NOT EXISTS area_type text DEFAULT 'dine_in' 
CHECK (area_type IN ('dine_in', 'express'));

-- ============================================================================
-- STEP 2: Tambah 4 aspek penilaian baru ke assessment_weights
-- ============================================================================
-- Cek aspek yang sudah ada dan tambahkan yang belum ada

-- Kedisiplinan & Kehadiran (discipline)
INSERT INTO assessment_weights (aspect_key, aspect_name, role, gender, max_score)
SELECT * FROM (VALUES
  ('discipline', 'Kedisiplinan & Kehadiran', 'crew'::role_enum, 'male'::gender_enum, 5),
  ('discipline', 'Kedisiplinan & Kehadiran', 'crew'::role_enum, 'female'::gender_enum, 5),
  ('discipline', 'Kedisiplinan & Kehadiran', 'leader'::role_enum, 'male'::gender_enum, 5),
  ('discipline', 'Kedisiplinan & Kehadiran', 'leader'::role_enum, 'female'::gender_enum, 5)
) AS new_data(aspect_key, aspect_name, role, gender, max_score)
WHERE NOT EXISTS (
  SELECT 1 FROM assessment_weights WHERE aspect_key = 'discipline'
);

-- Kerja Sama Tim (teamwork)
INSERT INTO assessment_weights (aspect_key, aspect_name, role, gender, max_score)
SELECT * FROM (VALUES
  ('teamwork', 'Kerja Sama Tim', 'crew'::role_enum, 'male'::gender_enum, 5),
  ('teamwork', 'Kerja Sama Tim', 'crew'::role_enum, 'female'::gender_enum, 5),
  ('teamwork', 'Kerja Sama Tim', 'leader'::role_enum, 'male'::gender_enum, 5),
  ('teamwork', 'Kerja Sama Tim', 'leader'::role_enum, 'female'::gender_enum, 5)
) AS new_data(aspect_key, aspect_name, role, gender, max_score)
WHERE NOT EXISTS (
  SELECT 1 FROM assessment_weights WHERE aspect_key = 'teamwork'
);

-- Tanggung Jawab & Kepatuhan SOP (sop_compliance)
INSERT INTO assessment_weights (aspect_key, aspect_name, role, gender, max_score)
SELECT * FROM (VALUES
  ('sop_compliance', 'Tanggung Jawab & Kepatuhan SOP', 'crew'::role_enum, 'male'::gender_enum, 5),
  ('sop_compliance', 'Tanggung Jawab & Kepatuhan SOP', 'crew'::role_enum, 'female'::gender_enum, 5),
  ('sop_compliance', 'Tanggung Jawab & Kepatuhan SOP', 'leader'::role_enum, 'male'::gender_enum, 5),
  ('sop_compliance', 'Tanggung Jawab & Kepatuhan SOP', 'leader'::role_enum, 'female'::gender_enum, 5)
) AS new_data(aspect_key, aspect_name, role, gender, max_score)
WHERE NOT EXISTS (
  SELECT 1 FROM assessment_weights WHERE aspect_key = 'sop_compliance'
);

-- Penanganan Komplain Pelanggan (complaint_handling)
INSERT INTO assessment_weights (aspect_key, aspect_name, role, gender, max_score)
SELECT * FROM (VALUES
  ('complaint_handling', 'Penanganan Komplain Pelanggan', 'crew'::role_enum, 'male'::gender_enum, 5),
  ('complaint_handling', 'Penanganan Komplain Pelanggan', 'crew'::role_enum, 'female'::gender_enum, 5),
  ('complaint_handling', 'Penanganan Komplain Pelanggan', 'leader'::role_enum, 'male'::gender_enum, 5),
  ('complaint_handling', 'Penanganan Komplain Pelanggan', 'leader'::role_enum, 'female'::gender_enum, 5)
) AS new_data(aspect_key, aspect_name, role, gender, max_score)
WHERE NOT EXISTS (
  SELECT 1 FROM assessment_weights WHERE aspect_key = 'complaint_handling'
);

-- ============================================================================
-- STEP 3: Buat tabel assessors
-- ============================================================================
CREATE TABLE IF NOT EXISTS assessors (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  code text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role_title text NOT NULL,
  is_internal_crew boolean DEFAULT false,
  crew_id uuid REFERENCES crew(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Seed data asesor
INSERT INTO assessors (code, full_name, role_title, is_internal_crew) VALUES
  ('crew',  'Crew / Leader (Peer)', 'Peer Assessment', true),
  ('qc1',   'Ramika',               'Quality Control 1', false),
  ('qc2',   'Agung',                'Quality Control 2', false),
  ('mse',   'Nabila',               'Marketing Strategist Executive', false),
  ('oc',    'Raihan',               'Operations Controller', false),
  ('expa',  'Tasya',                'EXPA', false),
  ('dos',   'Reza',                 'Digital Operations Specialist', false)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- STEP 4: Buat tabel assessor_aspect_mapping
-- ============================================================================
CREATE TABLE IF NOT EXISTS assessor_aspect_mapping (
  id serial PRIMARY KEY,
  aspect_key text NOT NULL,
  assessor_code text NOT NULL REFERENCES assessors(code) ON DELETE CASCADE,
  target_role text NOT NULL CHECK (target_role IN ('crew', 'leader')),
  is_enabled boolean DEFAULT true,
  UNIQUE(aspect_key, assessor_code, target_role)
);

-- ============================================================================
-- STEP 5: Seed matriks asesor dari pemetaan.md
-- ============================================================================
-- Format: (aspect_key, assessor_code, target_role, is_enabled)

-- Kepemimpinan & Manajerial (leadership)
-- Leader: semua TRUE
INSERT INTO assessor_aspect_mapping (aspect_key, assessor_code, target_role, is_enabled) VALUES
  ('leadership', 'crew',  'leader', true),
  ('leadership', 'qc1',   'leader', true),
  ('leadership', 'qc2',   'leader', true),
  ('leadership', 'mse',   'leader', true),
  ('leadership', 'oc',    'leader', true),
  ('leadership', 'expa',  'leader', true),
  ('leadership', 'dos',   'leader', true),
  -- Crew: semua FALSE
  ('leadership', 'crew',  'crew', false),
  ('leadership', 'qc1',   'crew', false),
  ('leadership', 'qc2',   'crew', false),
  ('leadership', 'mse',   'crew', false),
  ('leadership', 'oc',    'crew', false),
  ('leadership', 'expa',  'crew', false),
  ('leadership', 'dos',   'crew', false)
ON CONFLICT (aspect_key, assessor_code, target_role) DO UPDATE SET is_enabled = EXCLUDED.is_enabled;

-- Persiapan (preparation)
INSERT INTO assessor_aspect_mapping (aspect_key, assessor_code, target_role, is_enabled) VALUES
  ('preparation', 'crew',  'leader', true),
  ('preparation', 'qc1',   'leader', true),
  ('preparation', 'qc2',   'leader', true),
  ('preparation', 'mse',   'leader', false),
  ('preparation', 'oc',    'leader', false),
  ('preparation', 'expa',  'leader', false),
  ('preparation', 'dos',   'leader', false),
  ('preparation', 'crew',  'crew', true),
  ('preparation', 'qc1',   'crew', true),
  ('preparation', 'qc2',   'crew', true),
  ('preparation', 'mse',   'crew', false),
  ('preparation', 'oc',    'crew', false),
  ('preparation', 'expa',  'crew', false),
  ('preparation', 'dos',   'crew', false)
ON CONFLICT (aspect_key, assessor_code, target_role) DO UPDATE SET is_enabled = EXCLUDED.is_enabled;

-- Penerimaan Pesanan (cashier)
INSERT INTO assessor_aspect_mapping (aspect_key, assessor_code, target_role, is_enabled) VALUES
  ('cashier', 'crew',  'leader', true),
  ('cashier', 'qc1',   'leader', true),
  ('cashier', 'qc2',   'leader', false),
  ('cashier', 'mse',   'leader', true),
  ('cashier', 'oc',    'leader', false),
  ('cashier', 'expa',  'leader', false),
  ('cashier', 'dos',   'leader', true),
  ('cashier', 'crew',  'crew', true),
  ('cashier', 'qc1',   'crew', true),
  ('cashier', 'qc2',   'crew', true),
  ('cashier', 'mse',   'crew', false),
  ('cashier', 'oc',    'crew', true),
  ('cashier', 'expa',  'crew', false),
  ('cashier', 'dos',   'crew', false)
ON CONFLICT (aspect_key, assessor_code, target_role) DO UPDATE SET is_enabled = EXCLUDED.is_enabled;

-- Pembuatan Order (order_making)
INSERT INTO assessor_aspect_mapping (aspect_key, assessor_code, target_role, is_enabled) VALUES
  ('order_making', 'crew',  'leader', true),
  ('order_making', 'qc1',   'leader', true),
  ('order_making', 'qc2',   'leader', true),
  ('order_making', 'mse',   'leader', false),
  ('order_making', 'oc',    'leader', false),
  ('order_making', 'expa',  'leader', false),
  ('order_making', 'dos',   'leader', false),
  ('order_making', 'crew',  'crew', true),
  ('order_making', 'qc1',   'crew', true),
  ('order_making', 'qc2',   'crew', true),
  ('order_making', 'mse',   'crew', false),
  ('order_making', 'oc',    'crew', false),
  ('order_making', 'expa',  'crew', false),
  ('order_making', 'dos',   'crew', false)
ON CONFLICT (aspect_key, assessor_code, target_role) DO UPDATE SET is_enabled = EXCLUDED.is_enabled;

-- Pengemasan Pesanan (packing)
INSERT INTO assessor_aspect_mapping (aspect_key, assessor_code, target_role, is_enabled) VALUES
  ('packing', 'crew',  'leader', true),
  ('packing', 'qc1',   'leader', true),
  ('packing', 'qc2',   'leader', true),
  ('packing', 'mse',   'leader', false),
  ('packing', 'oc',    'leader', false),
  ('packing', 'expa',  'leader', false),
  ('packing', 'dos',   'leader', true),
  ('packing', 'crew',  'crew', true),
  ('packing', 'qc1',   'crew', true),
  ('packing', 'qc2',   'crew', true),
  ('packing', 'mse',   'crew', true),
  ('packing', 'oc',    'crew', false),
  ('packing', 'expa',  'crew', false),
  ('packing', 'dos',   'crew', false)
ON CONFLICT (aspect_key, assessor_code, target_role) DO UPDATE SET is_enabled = EXCLUDED.is_enabled;

-- Stock Opname (stock_opname)
INSERT INTO assessor_aspect_mapping (aspect_key, assessor_code, target_role, is_enabled) VALUES
  ('stock_opname', 'crew',  'leader', true),
  ('stock_opname', 'qc1',   'leader', true),
  ('stock_opname', 'qc2',   'leader', true),
  ('stock_opname', 'mse',   'leader', false),
  ('stock_opname', 'oc',    'leader', true),
  ('stock_opname', 'expa',  'leader', false),
  ('stock_opname', 'dos',   'leader', false),
  ('stock_opname', 'crew',  'crew', true),
  ('stock_opname', 'qc1',   'crew', true),
  ('stock_opname', 'qc2',   'crew', true),
  ('stock_opname', 'mse',   'crew', false),
  ('stock_opname', 'oc',    'crew', true),
  ('stock_opname', 'expa',  'crew', false),
  ('stock_opname', 'dos',   'crew', false)
ON CONFLICT (aspect_key, assessor_code, target_role) DO UPDATE SET is_enabled = EXCLUDED.is_enabled;

-- Kebersihan & Grooming (cleanliness)
INSERT INTO assessor_aspect_mapping (aspect_key, assessor_code, target_role, is_enabled) VALUES
  ('cleanliness', 'crew',  'leader', true),
  ('cleanliness', 'qc1',   'leader', true),
  ('cleanliness', 'qc2',   'leader', true),
  ('cleanliness', 'mse',   'leader', false),
  ('cleanliness', 'oc',    'leader', false),
  ('cleanliness', 'expa',  'leader', true),
  ('cleanliness', 'dos',   'leader', false),
  ('cleanliness', 'crew',  'crew', true),
  ('cleanliness', 'qc1',   'crew', true),
  ('cleanliness', 'qc2',   'crew', true),
  ('cleanliness', 'mse',   'crew', false),
  ('cleanliness', 'oc',    'crew', false),
  ('cleanliness', 'expa',  'crew', true),
  ('cleanliness', 'dos',   'crew', false)
ON CONFLICT (aspect_key, assessor_code, target_role) DO UPDATE SET is_enabled = EXCLUDED.is_enabled;

-- Kedisiplinan & Kehadiran (discipline)
INSERT INTO assessor_aspect_mapping (aspect_key, assessor_code, target_role, is_enabled) VALUES
  ('discipline', 'crew',  'leader', true),
  ('discipline', 'qc1',   'leader', true),
  ('discipline', 'qc2',   'leader', false),
  ('discipline', 'mse',   'leader', false),
  ('discipline', 'oc',    'leader', false),
  ('discipline', 'expa',  'leader', true),
  ('discipline', 'dos',   'leader', false),
  ('discipline', 'crew',  'crew', true),
  ('discipline', 'qc1',   'crew', false),
  ('discipline', 'qc2',   'crew', false),
  ('discipline', 'mse',   'crew', false),
  ('discipline', 'oc',    'crew', false),
  ('discipline', 'expa',  'crew', true),
  ('discipline', 'dos',   'crew', false)
ON CONFLICT (aspect_key, assessor_code, target_role) DO UPDATE SET is_enabled = EXCLUDED.is_enabled;

-- Kerja Sama Tim (teamwork)
INSERT INTO assessor_aspect_mapping (aspect_key, assessor_code, target_role, is_enabled) VALUES
  ('teamwork', 'crew',  'leader', true),
  ('teamwork', 'qc1',   'leader', true),
  ('teamwork', 'qc2',   'leader', false),
  ('teamwork', 'mse',   'leader', false),
  ('teamwork', 'oc',    'leader', false),
  ('teamwork', 'expa',  'leader', true),
  ('teamwork', 'dos',   'leader', false),
  ('teamwork', 'crew',  'crew', true),
  ('teamwork', 'qc1',   'crew', false),
  ('teamwork', 'qc2',   'crew', false),
  ('teamwork', 'mse',   'crew', false),
  ('teamwork', 'oc',    'crew', false),
  ('teamwork', 'expa',  'crew', true),
  ('teamwork', 'dos',   'crew', false)
ON CONFLICT (aspect_key, assessor_code, target_role) DO UPDATE SET is_enabled = EXCLUDED.is_enabled;

-- Tanggung Jawab & Kepatuhan SOP (sop_compliance)
INSERT INTO assessor_aspect_mapping (aspect_key, assessor_code, target_role, is_enabled) VALUES
  ('sop_compliance', 'crew',  'leader', true),
  ('sop_compliance', 'qc1',   'leader', true),
  ('sop_compliance', 'qc2',   'leader', true),
  ('sop_compliance', 'mse',   'leader', true),
  ('sop_compliance', 'oc',    'leader', true),
  ('sop_compliance', 'expa',  'leader', true),
  ('sop_compliance', 'dos',   'leader', true),
  ('sop_compliance', 'crew',  'crew', true),
  ('sop_compliance', 'qc1',   'crew', false),
  ('sop_compliance', 'qc2',   'crew', true),
  ('sop_compliance', 'mse',   'crew', true),
  ('sop_compliance', 'oc',    'crew', true),
  ('sop_compliance', 'expa',  'crew', true),
  ('sop_compliance', 'dos',   'crew', true)
ON CONFLICT (aspect_key, assessor_code, target_role) DO UPDATE SET is_enabled = EXCLUDED.is_enabled;

-- Penanganan Komplain Pelanggan (complaint_handling)
INSERT INTO assessor_aspect_mapping (aspect_key, assessor_code, target_role, is_enabled) VALUES
  ('complaint_handling', 'crew',  'leader', true),
  ('complaint_handling', 'qc1',   'leader', true),
  ('complaint_handling', 'qc2',   'leader', false),
  ('complaint_handling', 'mse',   'leader', true),
  ('complaint_handling', 'oc',    'leader', false),
  ('complaint_handling', 'expa',  'leader', false),
  ('complaint_handling', 'dos',   'leader', true),
  ('complaint_handling', 'crew',  'crew', true),
  ('complaint_handling', 'qc1',   'crew', false),
  ('complaint_handling', 'qc2',   'crew', false),
  ('complaint_handling', 'mse',   'crew', true),
  ('complaint_handling', 'oc',    'crew', false),
  ('complaint_handling', 'expa',  'crew', false),
  ('complaint_handling', 'dos',   'crew', true)
ON CONFLICT (aspect_key, assessor_code, target_role) DO UPDATE SET is_enabled = EXCLUDED.is_enabled;

-- ============================================================================
-- STEP 6: Buat tabel aspect_descriptions
-- ============================================================================
CREATE TABLE IF NOT EXISTS aspect_descriptions (
  id serial PRIMARY KEY,
  aspect_key text NOT NULL,
  area_type text NOT NULL CHECK (area_type IN ('dine_in', 'express')),
  description_text text NOT NULL,
  target_role text DEFAULT 'all' CHECK (target_role IN ('crew', 'leader', 'all')),
  UNIQUE(aspect_key, area_type, target_role)
);

-- Seed deskripsi dari template.md (Final Question Terbaru)
-- Kepemimpinan & Manajerial
INSERT INTO aspect_descriptions (aspect_key, area_type, description_text, target_role) VALUES
  ('leadership', 'dine_in', 'Untuk leader, aspek ini mencakup peran sebagai penengah saat ada masalah antar crew, mengingatkan jika ada yang salah, membangun kerja sama tim, dan menyampaikan info dari manajemen. Leader wajib mengatur jadwal shift crew dan memonitor mereka secara adil dan transparan. Leader harus memberikan pelatihan dan motivasi spesifik, membantu crew berkembang, menciptakan suasana kerja yang nyaman, memberi contoh langsung, serta menangani masalah operasional dengan cepat dan solutif.', 'leader'),
  ('leadership', 'express', 'Untuk leader, aspek ini mencakup peran sebagai penengah saat ada masalah antar crew, mengingatkan jika ada yang salah, membangun kerja sama tim, dan menyampaikan info dari manajemen. Leader wajib mengatur jadwal shift crew dan memonitor mereka secara adil dan transparan. Leader harus memberikan pelatihan dan motivasi spesifik, membantu crew berkembang, menciptakan suasana kerja yang nyaman, memberi contoh langsung, serta menangani masalah operasional dengan cepat dan solutif.', 'leader')
ON CONFLICT (aspect_key, area_type, target_role) DO UPDATE SET description_text = EXCLUDED.description_text;

-- Persiapan
INSERT INTO aspect_descriptions (aspect_key, area_type, description_text, target_role) VALUES
  ('preparation', 'dine_in', 'Crew cowok bertugas menyiapkan bahan beku, alat kitchen, adonan, dan alat produksi serta rajin melakukan pengecekan awal setiap pagi untuk memeriksa kelayakan bahan baku dengan mencium dan mencicipi bahan sisa kemarin agar tidak basi. Crew cewek menyiapkan area pelayanan, meja makan, dan alat order sampai rapi serta harus siap membantu kitchen saat outlet ramai. Saat menutup outlet, semua crew mengembalikan bahan rentan ke freezer, memanaskan kaldu, mematikan semua alat elektronik untuk keamanan, dan mengirim foto area closing ke grup WhatsApp. Leader memastikan outlet benar-benar siap saat buka dan memantau langsung seluruh prosedur sesuai standar operasional.', 'all'),
  ('preparation', 'express', 'Crew cowok menyiapkan bahan beku, alat kitchen, adonan, dan alat produksi serta melakukan pengecekan awal pagi untuk memastikan kelayakan bahan baku dengan mencium dan mencicipi bahan sisa kemarin. Crew cewek menyiapkan area transaksi take away, kasir, dan perlengkapan order sampai rapi dan bersih serta fleksibel membantu kitchen saat ramai. Saat penutupan, semua crew mengembalikan bahan rentan ke freezer, memanaskan kaldu, mematikan elektronik, dan mengirim bukti foto ke grup WhatsApp. Leader memastikan outlet siap saat buka dan memantau langsung prosedur pembukaan dan penutupan.', 'all')
ON CONFLICT (aspect_key, area_type, target_role) DO UPDATE SET description_text = EXCLUDED.description_text;

-- Penerimaan Pesanan
INSERT INTO aspect_descriptions (aspect_key, area_type, description_text, target_role) VALUES
  ('cashier', 'dine_in', 'Crew cowok mengecek dan menyiapkan pesanan aplikasi dengan cepat agar pengemudi tidak menunggu lama dan tidak komplain. Crew cewek menyambut pelanggan dengan hangat, mengarahkan ke meja yang pas, menjelaskan menu dan promo secara detail, menawarkan produk tambahan, mencatat pesanan akurat, serta fleksibel membantu kitchen saat ramai. Leader menjamin pelayanan di meja makan, take away, dan pesanan antar berjalan lancar serta memastikan waktu pengantaran sesuai target.', 'all'),
  ('cashier', 'express', 'Crew cowok mengecek dan menyiapkan pesanan aplikasi dengan cepat agar pengemudi tidak komplain serta wajib siap membantu pelayanan jika antrean take away membludak. Crew cewek menyambut pelanggan dengan hangat, menjelaskan menu dan promo secara detail, menawarkan produk tambahan, mencatat pesanan akurat, dan fleksibel membantu kitchen saat ramai. Leader menjaga kelancaran transaksi take away dan pengiriman agar sesuai target kecepatan.', 'all')
ON CONFLICT (aspect_key, area_type, target_role) DO UPDATE SET description_text = EXCLUDED.description_text;

-- Pembuatan Order
INSERT INTO aspect_descriptions (aspect_key, area_type, description_text, target_role) VALUES
  ('order_making', 'dine_in', 'Crew cowok di area kitchen dinilai dari kemahiran membuat sushi, kerapian, kesesuaian prosedur, tampilan hasil akhir, rasa yang pas, dan kepuasan konsumen. Crew cewek di area packing dinilai dari ketelitian menyiapkan produk untuk dikemas tanpa ada yang tertinggal serta inisiatif membantu bagian kitchen saat jam sibuk. Leader mengawasi kualitas, tampilan, dan rasa setiap pesanan agar standar tetap terjaga.', 'all'),
  ('order_making', 'express', 'Crew cowok di area kitchen dinilai dari kemahiran membuat sushi, kerapian, kesesuaian prosedur, tampilan, rasa, dan kepuasan konsumen, serta dinilai kesediaannya membantu area kasir jika antrean padat. Crew cewek di area packing dinilai dari ketelitian memeriksa kelengkapan barang yang siap dikemas dan inisiatif membantu kitchen saat sibuk. Leader mengawasi kualitas, tampilan, dan rasa pesanan agar standar tidak turun.', 'all')
ON CONFLICT (aspect_key, area_type, target_role) DO UPDATE SET description_text = EXCLUDED.description_text;

-- Pengemasan Pesanan
INSERT INTO aspect_descriptions (aspect_key, area_type, description_text, target_role) VALUES
  ('packing', 'dine_in', 'Semua crew bertanggung jawab atas packing produk yang lengkap dan rapi untuk pengiriman serta penyajian di atas meja yang rapi sesuai standar visual dine-in. Leader mengawasi proses pengemasan take away atau pesanan antar serta memastikan kerapian penyajian meja secara berkala.', 'all'),
  ('packing', 'express', 'Semua crew bertanggung jawab mengemas barang secara lengkap dan rapi khusus untuk pengiriman atau take away, serta memastikan kemasan aman dan tahan bocor selama perjalanan. Leader mengawasi keamanan pengemasan pesanan antar dan memastikan semua item lengkap.', 'all')
ON CONFLICT (aspect_key, area_type, target_role) DO UPDATE SET description_text = EXCLUDED.description_text;

-- Stock Opname
INSERT INTO aspect_descriptions (aspect_key, area_type, description_text, target_role) VALUES
  ('stock_opname', 'dine_in', 'Crew cewek bertugas mencatat dan merekapitulasi barang rusak serta data stok di sistem administrasi dengan teliti. Crew cowok mengurus manajemen logistik, mencatat barang rusak dan kerusakan piring conveyor secara rinci, serta menganalisis penyebab kerusakan untuk memberikan saran perbaikan. Leader bertugas menganalisis pola kerusakan dari catatan tim untuk menemukan solusi pencegahan.', 'all'),
  ('stock_opname', 'express', 'Crew cewek bertugas mencatat dan merekapitulasi data barang rusak dan jumlah stok di sistem administrasi secara teliti. Crew cowok mengurus logistik, mencatat detail barang rusak, menganalisa pola kerusakan barang, dan memberikan usulan perbaikan. Leader menganalisa pola kerusakan barang dari catatan harian crew dan merumuskan langkah pencegahan.', 'all')
ON CONFLICT (aspect_key, area_type, target_role) DO UPDATE SET description_text = EXCLUDED.description_text;

-- Kebersihan & Grooming
INSERT INTO aspect_descriptions (aspect_key, area_type, description_text, target_role) VALUES
  ('cleanliness', 'dine_in', 'Semua crew wajib menjaga penampilan dengan mengenakan seragam dan atribut lengkap serta memastikan rambut rapi. Crew cewek memastikan area konsumen seperti lantai, meja, dan kaca selalu bersih serta menerapkan prosedur sanitasi ketat di area kasir. Crew cowok merawat kebersihan area kitchen seperti kulkas, alat masak, tempat cuci piring, dan jerigen serta membersihkan alat produksi secara rutin agar tidak gampang rusak. Leader memantau kebersihan dan kerapian di semua area secara berkala.', 'all'),
  ('cleanliness', 'express', 'Semua crew wajib menjaga penampilan dengan seragam yang lengkap dan rambut rapi. Kebersihan seluruh area outlet (area depan dan kitchen) dikerjakan secara bersama-sama oleh semua crew agar lantai, meja, kaca, kulkas, alat masak, tempat cuci piring, dan jerigen tetap bersih. Crew wajib menjaga sanitasi kasir dan merawat alat produksi rutin. Leader memantau kebersihan dan kerapian seluruh area outlet secara berkala.', 'all')
ON CONFLICT (aspect_key, area_type, target_role) DO UPDATE SET description_text = EXCLUDED.description_text;

-- Kedisiplinan & Kehadiran
INSERT INTO aspect_descriptions (aspect_key, area_type, description_text, target_role) VALUES
  ('discipline', 'dine_in', 'Semua crew dinilai dari ketepatan waktu saat datang bekerja, tidak bolos tanpa alasan jelas, dan kepatuhan dalam mengikuti prosedur resmi saat mengajukan izin atau cuti. Leader memantau kedisiplinan tim secara adil dan memberikan contoh kedisiplinan yang baik.', 'all'),
  ('discipline', 'express', 'Semua crew dinilai dari ketepatan waktu saat datang bekerja, tidak bolos tanpa alasan jelas, dan kepatuhan dalam mengikuti prosedur resmi saat mengajukan izin atau cuti. Leader memantau kedisiplinan tim secara adil dan memberikan contoh kedisiplinan yang baik.', 'all')
ON CONFLICT (aspect_key, area_type, target_role) DO UPDATE SET description_text = EXCLUDED.description_text;

-- Kerja Sama Tim
INSERT INTO aspect_descriptions (aspect_key, area_type, description_text, target_role) VALUES
  ('teamwork', 'dine_in', 'Semua crew diharapkan mau membantu tim lain saat repot seperti membantu di kitchen, membuat minuman, atau mencuci alat saji. Crew juga harus bersedia mengurus administrasi tim, berbelanja kebutuhan outlet, dan menjaga suasana kerja yang kondusif tanpa menimbulkan drama. Leader bertanggung jawab membangun budaya kerja yang solid dan menyelesaikan konflik antar crew secara adil.', 'all'),
  ('teamwork', 'express', 'Semua crew dinilai dari kemauan melakukan banyak pekerjaan lintas bagian seperti crew kitchen yang pindah membantu kasir saat antrean penuh atau sebaliknya. Crew juga harus mau mengurus kebutuhan administrasi harian dan menghindari konflik personal. Leader bertugas membangun lingkungan kerja yang solid dan menengahi semua permasalahan tim.', 'all')
ON CONFLICT (aspect_key, area_type, target_role) DO UPDATE SET description_text = EXCLUDED.description_text;

-- Tanggung Jawab & Kepatuhan SOP
INSERT INTO aspect_descriptions (aspect_key, area_type, description_text, target_role) VALUES
  ('sop_compliance', 'dine_in', 'Crew cewek diwajibkan patuh pada standar pemasaran, pencatatan kasir, standar sumber daya manusia terkait penampilan, pembelian bahan, serta kontrol kualitas produksi. Crew cowok diwajibkan patuh pada standar visual pemasaran, produksi makanan, pencatatan barang rusak logistik, dan kedisiplinan. Leader ditugaskan memastikan semua standar ini dipatuhi, bertanggung jawab penuh atas hasil kerja anggota, dan menjamin konsistensi mutu operasional outlet.', 'all'),
  ('sop_compliance', 'express', 'Crew cewek diwajibkan patuh pada standar pemasaran, pencatatan kasir, standar sumber daya manusia terkait penampilan, pembelian bahan, serta kontrol kualitas produksi. Crew cowok diwajibkan patuh pada standar visual pemasaran, produksi makanan, pencatatan barang rusak logistik, dan kedisiplinan. Leader ditugaskan memastikan semua standar ini dipatuhi, bertanggung jawab penuh atas hasil kerja anggota, dan menjamin konsistensi mutu operasional outlet.', 'all')
ON CONFLICT (aspect_key, area_type, target_role) DO UPDATE SET description_text = EXCLUDED.description_text;

-- Penanganan Komplain Pelanggan
INSERT INTO aspect_descriptions (aspect_key, area_type, description_text, target_role) VALUES
  ('complaint_handling', 'dine_in', 'Semua crew dinilai dari empati dan kecepatan mencari solusi tanpa menghindari masalah saat pelanggan mengajukan keluhan. Jika terdapat kesalahan pencatatan order atau transaksi, crew tersebut wajib menanggung kerugian langsung ke kasir agar bisa direkapitulasi pada akhir bulan. Leader mengemban tugas untuk memverifikasi setiap komplain dari media sosial, menganalisis pola masalah, dan memastikan kejadian serupa tidak kembali terulang.', 'all'),
  ('complaint_handling', 'express', 'Semua crew dinilai dari empati dan kecepatan mencari solusi tanpa menghindari masalah saat pelanggan mengajukan keluhan. Jika terdapat kesalahan pencatatan order atau transaksi, crew tersebut wajib menanggung kerugian langsung ke kasir agar bisa direkapitulasi pada akhir bulan. Leader mengemban tugas untuk memverifikasi setiap komplain dari media sosial, menganalisis pola masalah, dan memastikan kejadian serupa tidak kembali terulang.', 'all')
ON CONFLICT (aspect_key, area_type, target_role) DO UPDATE SET description_text = EXCLUDED.description_text;

-- ============================================================================
-- STEP 7: Tambah kolom assessor_code ke tabel crew (opsional, untuk link ke assessors)
-- ============================================================================
ALTER TABLE crew 
ADD COLUMN IF NOT EXISTS assessor_code text REFERENCES assessors(code) ON DELETE SET NULL;

-- ============================================================================
-- STEP 7.5: Tambah kolom assessor_code ke tabel assessments
-- ============================================================================
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS assessor_code text;

-- ============================================================================
-- STEP 8: Enable RLS pada tabel baru (mengikuti pola tabel lama)
-- ============================================================================
ALTER TABLE assessors ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessor_aspect_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE aspect_descriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public read access (sama seperti tabel lain di project ini)
CREATE POLICY "Allow public read assessors" ON assessors FOR SELECT USING (true);
CREATE POLICY "Allow public read mapping" ON assessor_aspect_mapping FOR SELECT USING (true);
CREATE POLICY "Allow public read descriptions" ON aspect_descriptions FOR SELECT USING (true);

-- Policy: Allow service role full access
CREATE POLICY "Allow service role full access assessors" ON assessors FOR ALL USING (true);
CREATE POLICY "Allow service role full access mapping" ON assessor_aspect_mapping FOR ALL USING (true);
CREATE POLICY "Allow service role full access descriptions" ON aspect_descriptions FOR ALL USING (true);

-- ============================================================================
-- SELESAI! Verifikasi dengan query berikut:
-- ============================================================================
-- SELECT * FROM assessors ORDER BY code;
-- SELECT * FROM assessor_aspect_mapping WHERE is_enabled = true ORDER BY aspect_key, target_role;
-- SELECT * FROM aspect_descriptions ORDER BY aspect_key, area_type;
-- SELECT DISTINCT aspect_key FROM assessment_weights ORDER BY aspect_key;
-- SELECT area_type FROM outlets;
