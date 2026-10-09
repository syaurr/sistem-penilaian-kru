import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
export const revalidate = 0;

/**
 * POST /api/submit-assessment
 * Body: { period_id, assessor_id, assessed_id, scores, assessor_code }
 * 
 * Menggunakan supabaseAdmin (service role) untuk bypass RLS.
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

        // Validasi scores bukan object kosong
        if (typeof scores !== 'object' || Object.keys(scores).length === 0) {
            return NextResponse.json(
                { message: 'Scores harus berisi minimal 1 aspek penilaian.' },
                { status: 400 }
            );
        }

        // Cek duplikat: apakah assessor sudah pernah menilai assessed ini di periode yang sama?
        let duplicateQuery = supabaseAdmin
            .from('assessments')
            .select('id', { count: 'exact', head: true })
            .eq('period_id', period_id)
            .eq('assessed_id', assessed_id);

        const effectiveCode = assessor_code || 'crew';

        if (effectiveCode !== 'crew' && !assessor_id) {
            // Spesialis tanpa assessor_id — cek by assessor_code
            duplicateQuery = duplicateQuery.eq('assessor_code', effectiveCode);
        } else if (assessor_id) {
            duplicateQuery = duplicateQuery.eq('assessor_id', assessor_id);
        }

        const { count: existingCount } = await duplicateQuery;

        if (existingCount && existingCount > 0) {
            return NextResponse.json(
                { message: 'Kamu sudah pernah menilai orang ini di periode ini.' },
                { status: 409 }
            );
        }

        // Cek apakah assessor_id valid di tabel crew (jika ada)
        let finalAssessorId = assessor_id || null;
        
        if (finalAssessorId) {
            const { data: crewCheck } = await supabaseAdmin
                .from('crew')
                .select('id')
                .eq('id', finalAssessorId)
                .single();
            
            if (!crewCheck) {
                // assessor_id bukan dari crew → set null agar tidak melanggar FK
                finalAssessorId = null;
            }
        }

        const insertData: Record<string, any> = {
            period_id,
            assessed_id,
            scores,
            assessor_code: effectiveCode,
        };

        // Hanya set assessor_id jika valid (ada di tabel crew)
        if (finalAssessorId) {
            insertData.assessor_id = finalAssessorId;
        }

        const { data, error } = await supabaseAdmin
            .from('assessments')
            .insert(insertData)
            .select();

        if (error) {
            console.error('Supabase insert error:', JSON.stringify(error));
            
            // Handle specific Postgres errors
            if (error.code === '23505') {
                return NextResponse.json(
                    { message: 'Penilaian duplikat: kamu sudah pernah menilai orang ini.' },
                    { status: 409 }
                );
            }
            if (error.code === '23503') {
                return NextResponse.json(
                    { message: 'Data referensi tidak valid (periode atau kru tidak ditemukan).' },
                    { status: 400 }
                );
            }
            
            throw error;
        }

        return NextResponse.json(
            { message: 'Penilaian berhasil disimpan.', id: data?.[0]?.id },
            { status: 201 }
        );
    } catch (error: any) {
        console.error('POST /api/submit-assessment Error:', error.message, error.details || '');
        return NextResponse.json(
            { message: 'Gagal menyimpan penilaian. Silakan coba lagi.', error: error.message },
            { status: 500 }
        );
    }
}
