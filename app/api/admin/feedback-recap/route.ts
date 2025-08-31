import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
export const revalidate = 0;
export const dynamic = 'force-dynamic';

// Helper untuk konversi rating emoji ke poin
const ratingToPoints = (rating: string): number => {
    const map: { [key: string]: number } = {
        'Sangat Buruk': 1,
        'Buruk': 2,
        'Biasa Saja': 3,
        'Baik': 4,
        'Sangat Baik': 5,
    };
    return map[rating] || 0;
};

export async function GET() {
    try {
        const { data: activePeriod, error: periodError } = await supabaseAdmin
            .from('assessment_periods')
            .select('id, name')
            .eq('is_active', true)
            .single();

        if (periodError) throw new Error("Periode aktif tidak ditemukan.");

        const { data: feedbackData, error: feedbackError } = await supabaseAdmin
            .from('app_feedback')
            .select('id, category, rating, message, message_category')
            .eq('period_id', activePeriod.id);

        if (feedbackError) throw feedbackError;

        // 1. Proses data untuk chart
        let systemTotalPoints = 0;
        let hrTotalPoints = 0;
        let systemResponses = 0;
        let hrResponses = 0;
        
        feedbackData.forEach(item => {
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
        
        // 2. Proses data untuk tabel pesan
        const messages = feedbackData
            .filter(item => item.message) // Ambil yang ada pesannya saja
            .map(item => ({
                id: item.id,
                message: item.message,
                category: item.message_category // Gunakan kolom baru
            }));

        const responseData = {
            periodName: activePeriod.name,
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