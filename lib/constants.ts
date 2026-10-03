import type { AspectKey, AssessorCode } from '@/types';

// ============================================================================
// Constants — Sistem Penilaian Kru v2
// ============================================================================

/**
 * Urutan aspek penilaian (11 aspek).
 * Digunakan di dashboard, PDF export, dan form penilaian.
 */
export const ASPECT_ORDER: AspectKey[] = [
  'leadership',
  'preparation',
  'cashier',
  'order_making',
  'packing',
  'stock_opname',
  'cleanliness',
  'discipline',
  'teamwork',
  'sop_compliance',
  'complaint_handling',
];

/**
 * Nama tampilan untuk setiap aspek penilaian.
 */
export const ASPECT_DISPLAY_NAMES: Record<AspectKey, string> = {
  leadership: 'Kepemimpinan',
  preparation: 'Persiapan',
  cashier: 'Penerimaan',
  order_making: 'Pembuatan',
  packing: 'Pengemasan',
  stock_opname: 'Stock Opname',
  cleanliness: 'Kebersihan',
  discipline: 'Kedisiplinan',
  teamwork: 'Kerja Sama',
  sop_compliance: 'Kepatuhan SOP',
  complaint_handling: 'Komplain',
};

/**
 * Nama tampilan lengkap untuk setiap aspek (digunakan di form dan deskripsi).
 */
export const ASPECT_FULL_NAMES: Record<AspectKey, string> = {
  leadership: 'Kepemimpinan & Manajerial',
  preparation: 'Persiapan',
  cashier: 'Penerimaan Pesanan',
  order_making: 'Pembuatan Order',
  packing: 'Pengemasan Pesanan',
  stock_opname: 'Stock Opname',
  cleanliness: 'Kebersihan & Grooming',
  discipline: 'Kedisiplinan & Kehadiran',
  teamwork: 'Kerja Sama Tim',
  sop_compliance: 'Tanggung Jawab & Kepatuhan SOP',
  complaint_handling: 'Penanganan Komplain Pelanggan',
};

/**
 * Emoji untuk setiap aspek (digunakan di form deskripsi).
 */
export const ASPECT_EMOJIS: Record<AspectKey, string> = {
  leadership: '🧑‍🏫',
  preparation: '🧰',
  cashier: '🛎️',
  order_making: '🍣',
  packing: '📦',
  stock_opname: '📊',
  cleanliness: '🧼',
  discipline: '⏰',
  teamwork: '🤝',
  sop_compliance: '📋',
  complaint_handling: '💬',
};

/**
 * Nama tampilan untuk setiap kode asesor.
 */
export const ASSESSOR_DISPLAY_NAMES: Record<AssessorCode, string> = {
  crew: 'Crew / Leader (Peer)',
  qc1: 'Ramika (QC1)',
  qc2: 'Agung (QC2)',
  mse: 'Nabila (MSE)',
  oc: 'Raihan (OC)',
  expa: 'Tasya (EXPA)',
  dos: 'Reza (DOS)',
};

/**
 * Daftar kode asesor spesialis (non-crew/peer).
 */
export const SPECIALIST_ASSESSOR_CODES: AssessorCode[] = [
  'qc1', 'qc2', 'mse', 'oc', 'expa', 'dos',
];

/**
 * Nama tampilan untuk tipe area outlet.
 */
export const AREA_TYPE_DISPLAY_NAMES: Record<string, string> = {
  dine_in: 'Dine-in',
  express: 'Express',
};

/**
 * Warna untuk skor persentase (digunakan di dashboard dan PDF).
 */
export const getScoreColorClass = (aspectData?: { score: number; max_score: number }): string => {
  if (!aspectData || aspectData.max_score === 0) return 'bg-gray-100';
  const percentage = (aspectData.score / aspectData.max_score) * 100;
  if (percentage >= 75) return 'bg-teal-100 text-teal-800';
  if (percentage >= 50) return 'bg-green-100 text-green-800';
  return 'bg-yellow-100 text-yellow-800';
};
