// api/admin/feedback-recap/route.ts

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
export const revalidate = 0;
export const dynamic = 'force-dynamic';

// Helper (Tidak berubah)
const ratingToPoints = (rating: string): number => {
    // ... (kode helper Anda tidak berubah)
    const map: { [key: string]: number } = {
        'Sangat Buruk': 1,
        'Buruk': 2,
        'Biasa Saja': 3,
        'Baik': 4,
        'Sangat Baik': 5,
    };
    return map[rating] || 0;
};

// MODIFIKASI: Tambahkan 'request: Request'
export async function GET(request: Request) {
    try {
        // MODIFIKASI: Ambil period_id dari search query
        const { searchParams } = new URL(request.url);
        const periodId = searchParams.get('period_id');

        if (!periodId) {
            throw new Error("Period ID wajib disertakan.");
        }

        // MODIFIKASI: Query berdasarkan periodId yang diberikan, bukan 'is_active'
        const { data: period, error: periodError } = await supabaseAdmin
            .from('assessment_periods')
            .select('id, name')
            .eq('id', periodId) // Ubah dari 'is_active' ke 'id'
            .single();

        if (periodError) throw new Error(`Periode dengan ID ${periodId} tidak ditemukan.`);

        // MODIFIKASI: Gunakan 'period.id' (sebelumnya activePeriod.id)
        const { data: feedbackData, error: feedbackError } = await supabaseAdmin
            .from('app_feedback')
            .select('id, category, rating, message, message_category')
            .eq('period_id', period.id);

        if (feedbackError) throw feedbackError;

        // 1. Proses data untuk chart (Logika ini tidak berubah)
        let systemTotalPoints = 0;
        let hrTotalPoints = 0;
        let systemResponses = 0;
        let hrResponses = 0;
        
        feedbackData.forEach(item => {
            // ... (logika forEach Anda tidak berubah)
            if (item.category === 'sistem') {
                systemTotalPoints += ratingToPoints(item.rating);
                systemResponses++;
            } else if (item.category === 'hr') {
                hrTotalPoints += ratingToPoints(item.rating);
                hrResponses++;
            }
        });

        const systemAverage = systemResponses > 0 ? systemTotalPoints / systemResponses : 0;
        const hrAverage = hrResponses > 0 ? hrTotalPoints / hrResponses : 0;
        
        // 2. Proses data untuk tabel pesan (Logika ini tidak berubah)
        const messages = feedbackData
            .filter(item => item.message) 
            .map(item => ({
                id: item.id,
                message: item.message,
                category: item.message_category
            }));

        const responseData = {
            // MODIFIKASI: Gunakan 'period.name' (sebelumnya activePeriod.name)
            periodName: period.name,
            systemRecap: {
                averageScore: parseFloat(systemAverage.toFixed(2)),
                totalResponses: systemResponses,
            },
            hrRecap: {
                averageScore: parseFloat(hrAverage.toFixed(2)),
                totalResponses: hrResponses,
            },
            messages: messages,
        };

        return NextResponse.json(responseData, { headers: { 'Cache-Control': 'no-store' } });

    } catch (error: any) {
        console.error("Error fetching feedback recap:", error);
        return NextResponse.json({ message: error.message }, { status: 500,
            headers: { 'Cache-Control': 'no-store' }
        });
    }
}