import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
export const revalidate = 0;

/**
 * POST /api/submit-assessment
 * Body: { period_id, assessor_id, assessed_id, scores }
 * 
 * Menggunakan supabaseAdmin (service role) untuk bypass RLS
 * dan menangani kasus di mana assessor_id bukan dari tabel crew
 * (misalnya penilai spesialis).
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { period_id, assessor_id, assessed_id, scores, assessor_code } = body;

        if (!period_id || !assessed_id || !scores) {
            return NextResponse.json(
                { message: 'period_id, assessed_id, dan scores wajib diisi.' },
                { status: 400 }
            );
        }

        // Cek apakah assessor_id valid di tabel crew
        let finalAssessorId = assessor_id;
        
        if (assessor_id) {
            const { data: crewCheck } = await supabaseAdmin
                .from('crew')
                .select('id')
                .eq('id', assessor_id)
                .single();
            
            if (!crewCheck) {
                // assessor_id bukan dari crew (misalnya dari tabel assessors / spesialis)
                // Set null agar tidak melanggar FK constraint
                finalAssessorId = null;
            }
        }

        const insertData: Record<string, any> = {
            period_id,
            assessed_id,
            scores,
            assessor_code: assessor_code || 'crew',
        };

        // Hanya set assessor_id jika valid (ada di tabel crew)
        if (finalAssessorId) {
            insertData.assessor_id = finalAssessorId;
        }

        const { data, error } = await supabaseAdmin
            .from('assessments')
            .insert(insertData)
            .select();

        if (error) throw error;

        return NextResponse.json(
            { message: 'Penilaian berhasil disimpan.', id: data?.[0]?.id },
            { status: 201 }
        );
    } catch (error: any) {
        console.error('POST /api/submit-assessment Error:', error.message);
        return NextResponse.json(
            { message: 'Gagal menyimpan penilaian.', error: error.message },
            { status: 500 }
        );
    }
}
