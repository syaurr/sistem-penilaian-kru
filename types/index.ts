// ============================================================================
// Shared TypeScript Types — Sistem Penilaian Kru v2
// ============================================================================

// --- Entitas Database ---

export type Outlet = {
  id: string;
  name: string;
  outlet_code: string;
  area_type: 'dine_in' | 'express';
};

export type CrewMember = {
  id: string;
  full_name: string;
  role: 'crew' | 'leader';
  gender: 'male' | 'female';
  is_active: boolean;
  outlet_id?: string;
  outlets?: { name: string; area_type?: string } | null;
  assessor_code?: string | null;
};

export type Assessor = {
  id: string;
  code: AssessorCode;
  full_name: string;
  role_title: string;
  is_internal_crew: boolean;
  crew_id?: string | null;
};

export type AssessorAspectMapping = {
  id: number;
  aspect_key: AspectKey;
  assessor_code: AssessorCode;
  target_role: 'crew' | 'leader';
  is_enabled: boolean;
};

export type AspectDescription = {
  id: number;
  aspect_key: AspectKey;
  area_type: 'dine_in' | 'express';
  description_text: string;
  target_role: 'crew' | 'leader' | 'all';
};

export type AssessmentWeight = {
  id: number;
  aspect_key: AspectKey;
  aspect_name: string;
  role: string;
  gender: string;
  max_score: number;
};

export type Aspect = {
  aspect_key: AspectKey;
  aspect_name: string;
};

// --- Enums / Union Types ---

export type AspectKey =
  | 'leadership'
  | 'preparation'
  | 'cashier'
  | 'order_making'
  | 'packing'
  | 'stock_opname'
  | 'cleanliness'
  | 'discipline'
  | 'teamwork'
  | 'sop_compliance'
  | 'complaint_handling';

export type AssessorCode =
  | 'crew'
  | 'qc1'
  | 'qc2'
  | 'mse'
  | 'oc'
  | 'expa'
  | 'dos';

export type AreaType = 'dine_in' | 'express';

// --- Dashboard / Rekapitulasi ---

export type AspectScore = {
  score: number;
  max_score: number;
};

export type RecapData = {
  id: string;
  nama: string;
  outlet: string;
  role: string;
  aspectScores: { [key: string]: AspectScore };
  totalNilaiCrew: number;
  totalNilaiAkhir: number;
  rank: number;
  bonusStatus: string;
  totalPotentialAssessors: number;
  actualAssessorsCount: number;
  peerAssessorsCount: number;
  specialistAssessorsCount: number;
  targetAssessmentsToSubmit: number;
  submittedAssessmentsCount: number;
  submissionStatus: 'none' | 'partial' | 'completed';
};

// --- Form / Assessment ---

export type Step = 'welcome' | 'description' | 'selectAssessorType' | 'selectAssessor' | 'selectAssessed' | 'rating' | 'success';
