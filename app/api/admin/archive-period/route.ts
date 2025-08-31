import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
    try {
        const { period_id } = await request.json();
        if (!period_id) throw new Error("ID Periode dibutuhkan.");

        const { data: existingRankings, error: checkError } = await supabaseAdmin
            .from('monthly_rankings')
            .select('id')
            .eq('period_id', period_id)
            .limit(1);

        if (checkError) throw checkError;
        if (existingRankings && existingRankings.length > 0) {
            return NextResponse.json({ message: "Periode ini sudah pernah diarsipkan sebelumnya." }, { status: 409,
                headers: { 'Cache-Control': 'no-store' }
            });
        }

        // --- MENGGUNAKAN LOGIKA KALKULASI YANG SAMA DENGAN DASHBOARD ---
        const [crewResponse, assessmentsResponse, supervisorAssessmentsResponse, weightsResponse] = await Promise.all([
            supabaseAdmin.from('crew').select('id, full_name, role, gender, outlets(name)').eq('is_active', true),
            supabaseAdmin.from('assessments').select('assessed_id, scores').eq('period_id', period_id),
            supabaseAdmin.from('supervisor_assessments').select('assessed_crew_id, score').eq('period_id', period_id),
            supabaseAdmin.from('assessment_weights').select('*'),
        ]);
        
        const { data: allCrew } = crewResponse;
        const { data: allAssessments } = assessmentsResponse;
        const { data: allSupervisorAssessments } = supervisorAssessmentsResponse;
        const { data: weights } = weightsResponse;

        if (!allCrew || !allAssessments || !allSupervisorAssessments || !weights) {
            throw new Error("Gagal mengambil data lengkap untuk kalkulasi arsip.");
        }

        const assessmentsByCrew = new Map<string, any[]>();
        allAssessments.forEach(a => {
            if (!assessmentsByCrew.has(a.assessed_id)) assessmentsByCrew.set(a.assessed_id, []);
            assessmentsByCrew.get(a.assessed_id)?.push(a);
        });

        const supervisorAssessmentsByCrew = new Map<string, number[]>();
        allSupervisorAssessments.forEach(sa => {
            if (!supervisorAssessmentsByCrew.has(sa.assessed_crew_id)) supervisorAssessmentsByCrew.set(sa.assessed_crew_id, []);
            supervisorAssessmentsByCrew.get(sa.assessed_crew_id)?.push(sa.score);
        });
        
        const weightsMap = new Map(weights.map(w => [`${w.role}-${w.gender}-${w.aspect_key}`, w.max_score]));

        const recapData = allCrew
            .filter(crew => crew.role !== 'supervisor')
            .map(crew => {
                const crewAssessments = assessmentsByCrew.get(crew.id) || [];
                const supervisorScores = supervisorAssessmentsByCrew.get(crew.id) || [];
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
                    const maxScore = weightsMap.get(`${crew.role}-${crew.gender}-${aspectKey}`) || 0;
                    totalNilaiCrew += (avgRating / 5) * maxScore;
                }

                let totalSupervisorScore = 0;
                if(supervisorScores.length > 0) {
                    totalSupervisorScore = supervisorScores.reduce((a, b) => a + b, 0) / supervisorScores.length;
                }
                
                const totalNilaiAkhir = (totalNilaiCrew * 0.6) + (totalSupervisorScore * 0.4);

                return { crew_id: crew.id, final_score: totalNilaiAkhir };
            });
        
        recapData.sort((a, b) => b.final_score - a.final_score);

        const top25 = recapData.slice(0, 25).map((item, index) => ({
            period_id: period_id,
            crew_id: item.crew_id,
            rank: index + 1,
            final_score: item.final_score
        }));

        if (top25.length > 0) {
            const { error: insertError } = await supabaseAdmin.from('monthly_rankings').insert(top25);
            if (insertError) throw insertError;
        }
        
        const { error: updateError } = await supabaseAdmin.from('assessment_periods').update({ is_active: false }).eq('id', period_id);
        if (updateError) throw updateError;
        
        return NextResponse.json({ message: 'Periode berhasil diarsipkan!' }, { headers: { 'Cache-Control': 'no-store' } });

    } catch (error: any) {
        console.error("Archive Period Error:", error);
        return NextResponse.json({ message: error.message }, { status: 500,
            headers: { 'Cache-Control': 'no-store' }
        });
    }
}