import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// GET: Mengambil semua data bobot
export async function GET() {
    const { data, error } = await supabaseAdmin.from('assessment_weights').select('*').order('id');
    if (error) return NextResponse.json({ message: error.message }, { status: 500 });
    return NextResponse.json(data);
}

// PATCH: Menerima array of updates dan menyimpannya
export async function PATCH(request: Request) {
    try {
        const weightsToUpdate: { id: number; max_score: number }[] = await request.json();

        // Lakukan update untuk setiap item dalam array
        const updatePromises = weightsToUpdate.map(weight => 
            supabaseAdmin.from('assessment_weights')
                .update({ max_score: weight.max_score })
                .eq('id', weight.id)
        );

        const results = await Promise.all(updatePromises);
        const firstError = results.find(res => res.error);

        if (firstError?.error) throw firstError.error;

        return NextResponse.json({ message: 'Semua bobot berhasil diperbarui' });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}