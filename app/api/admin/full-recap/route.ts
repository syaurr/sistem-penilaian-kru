import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
export const revalidate = 0;
export const dynamic = 'force-dynamic';

function noPeriodResponse() {
    return NextResponse.json(
        { recapData: [], chartData: {}, activePeriodName: "Tidak Ada Periode Aktif", debugInfo: null },
        { headers: { 'Cache-Control': 'no-store' } }
    );
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const requestedPeriodId = searchParams.get('periodId');
        let targetPeriod: any;

        if (requestedPeriodId) {
            const { data, error } = await supabaseAdmin.from('assessment_periods').select('*').eq('id', requestedPeriodId).single();
            if (error) return noPeriodResponse(); 
            targetPeriod = data;
        } else {
            const { data, error } = await supabaseAdmin.from('assessment_periods').select('*').eq('is_active', true).single();
            if (error || !data) return noPeriodResponse(); 
            targetPeriod = data;
        }

        const periodId = targetPeriod.id;
        
        // --- PERBAIKAN: Tambahkan .limit(10000) agar data tidak terpotong default Supabase ---
        const [crewResponse, assessmentsResponse, supervisorAssessmentsResponse, weightsResponse, nullPeriodResponse] = await Promise.all([
            supabaseAdmin.from('crew').select('id, full_name, role, gender, outlet_id, outlets(name)').eq('is_active', true),
            supabaseAdmin.from('assessments').select('assessor_id, assessed_id, scores, period_id').eq('period_id', periodId).limit(10000),
            supabaseAdmin.from('supervisor_assessments').select('assessed_crew_id, score').eq('period_id', periodId).limit(10000),
            supabaseAdmin.from('assessment_weights').select('*').limit(1000),
            // Cek apakah ada form nyasar (period_id kosong)
            supabaseAdmin.from('assessments').select('id', { count: 'exact', head: true }).is('period_id', null)
        ]);

        const { data: allCrew } = crewResponse;
        const { data: allAssessments } = assessmentsResponse;
        const { data: allSupervisorAssessments } = supervisorAssessmentsResponse;
        const { data: weights } = weightsResponse;

        if (!allCrew || !allAssessments || !allSupervisorAssessments || !weights) throw new Error("Gagal mengambil data lengkap.");

        const assessmentsByCrew = new Map<string, any[]>();
        const submittedAssessmentsByCrew = new Map<string, number>(); 
        
        // --- PERBAIKAN: Mapping Nama untuk Debugging ---
        const crewNameMap = new Map(allCrew.map(c => [c.id, c.full_name]));
        const rawAssessmentTracking: Record<string, string[]> = {};

        allAssessments.forEach(a => {
            if (!assessmentsByCrew.has(a.assessed_id)) assessmentsByCrew.set(a.assessed_id, []);
            assessmentsByCrew.get(a.assessed_id)?.push(a);

            if (a.assessor_id) {
                submittedAssessmentsByCrew.set(a.assessor_id, (submittedAssessmentsByCrew.get(a.assessor_id) || 0) + 1);
            }

            // Catat log detail "Siapa menilai Siapa" untuk panel UI
            const assessedName = crewNameMap.get(a.assessed_id) || `ID Tak Dikenal: ${a.assessed_id.substring(0,6)}...`;
            const assessorName = crewNameMap.get(a.assessor_id) || `ID Tak Dikenal: ${a.assessor_id.substring(0,6)}...`;
            if (!rawAssessmentTracking[assessedName]) {
                rawAssessmentTracking[assessedName] = [];
            }
            rawAssessmentTracking[assessedName].push(assessorName);
        });

        const supervisorAssessmentsByCrew = new Map<string, number[]>();
        allSupervisorAssessments.forEach(sa => {
            if (!supervisorAssessmentsByCrew.has(sa.assessed_crew_id)) supervisorAssessmentsByCrew.set(sa.assessed_crew_id, []);
            supervisorAssessmentsByCrew.get(sa.assessed_crew_id)?.push(sa.score);
        });

        const weightsMap = new Map(weights.map(w => [`${w.role}-${w.gender}-${w.aspect_key}`, w.max_score]));
        
        const crewByOutlet = allCrew.reduce((acc, crew) => {
            if (crew.role !== 'supervisor') {
                const outletId = crew.outlet_id || 'unknown';
                if (!acc[outletId]) acc[outletId] = 0;
                acc[outletId]++;
            }
            return acc;
        }, {} as Record<string, number>);

        const missingWeightKeys = new Set<string>();

        let recapData = allCrew.filter(crew => crew.role !== 'supervisor').map(crew => {
            const crewAssessments = assessmentsByCrew.get(crew.id) || [];
            const supervisorScores = supervisorAssessmentsByCrew.get(crew.id) || [];
            const aspectScores: { [key: string]: { score: number; max_score: number } } = {};
            const aspectRatings: { [key: string]: number[] } = {};
            
            crewAssessments.forEach(assessment => {
                for (const aspectKey in assessment.scores) {
                    if (!aspectRatings[aspectKey]) aspectRatings[aspectKey] = [];
                    aspectRatings[aspectKey].push(assessment.scores[aspectKey]);
                }
            });
            
            let totalNilaiCrew = 0;
            for (const aspectKey in aspectRatings) {
                const avgRating = aspectRatings[aspectKey].reduce((a, b) => a + b, 0) / aspectRatings[aspectKey].length;
                const weightKey = `${crew.role}-${crew.gender}-${aspectKey}`;
                const maxScore = weightsMap.get(weightKey);
                
                if (maxScore === undefined) missingWeightKeys.add(weightKey); 
                
                const finalMaxScore = maxScore || 0;
                const weightedScore = (avgRating / 5) * finalMaxScore;
                aspectScores[aspectKey] = { score: weightedScore, max_score: finalMaxScore };
                totalNilaiCrew += weightedScore;
            }
            
            const nilaiSupervisor1 = supervisorScores[0] || 0;
            const nilaiSupervisor2 = supervisorScores[1] || 0;
            let totalSupervisorScore = supervisorScores.length > 0 ? supervisorScores.reduce((a, b) => a + b, 0) / supervisorScores.length : 0;
            const totalNilaiAkhir = (totalNilaiCrew * 0.6) + (totalSupervisorScore * 0.4);
            const totalPotentialAssessors = (crewByOutlet[crew.outlet_id] || 1) - 1;
            const actualAssessorsCount = crewAssessments.length;

            const targetAssessmentsToSubmit = totalPotentialAssessors;
            const submittedAssessmentsCount = submittedAssessmentsByCrew.get(crew.id) || 0;
            let submissionStatus = 'completed';
            
            if (targetAssessmentsToSubmit > 0) {
                if (submittedAssessmentsCount === 0) {
                    submissionStatus = 'none';
                } else if (submittedAssessmentsCount < targetAssessmentsToSubmit) {
                    submissionStatus = 'partial';
                }
            }

            return {
                id: crew.id, nama: crew.full_name, outlet: (crew.outlets as any)?.name || 'N/A', role: crew.role,
                aspectScores, totalNilaiCrew, nilaiSupervisor1, nilaiSupervisor2, totalNilaiAkhir,
                totalPotentialAssessors, actualAssessorsCount,
                targetAssessmentsToSubmit, submittedAssessmentsCount, submissionStatus
            };
        });

        recapData.sort((a, b) => b.totalNilaiAkhir - a.totalNilaiAkhir);
        const finalRankedData = recapData.map((item, index) => ({ ...item, rank: index + 1 }));

        const chartData: { [key: string]: any[] } = {};
        const aspectKeys = ["leadership", "preparation", "cashier", "order_making", "packing", "stock_opname", "cleanliness"];
        aspectKeys.forEach(key => {
            chartData[key] = finalRankedData
                .filter(item => item.aspectScores[key] !== undefined)
                .map(item => ({ name: item.nama.split(' ')[0], score: item.aspectScores[key].score }))
                .sort((a, b) => b.score - a.score)
                .slice(0, 3);
        });

        // Debug Info Collector
        const debugInfo = {
            periodId,
            totalCrewActiveFetched: allCrew.length,
            totalCrewEvaluated: recapData.length,
            totalAssessmentsFetched: allAssessments.length,
            totalSpvAssessmentsFetched: allSupervisorAssessments.length,
            totalWeightsFetched: weights.length,
            missingWeightKeys: Array.from(missingWeightKeys),
            nullPeriodCount: nullPeriodResponse.count || 0, // Form yang periodenya kosong
            rawAssessmentTracking // Lacak siapa menilai siapa
        };

        return NextResponse.json({
            recapData: finalRankedData,
            activePeriodName: targetPeriod.name,
            chartData: chartData,
            debugInfo: debugInfo
        }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error: any) {
        console.error("Error in full-recap API:", error);
        return NextResponse.json({ message: error.message }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
    }
}
