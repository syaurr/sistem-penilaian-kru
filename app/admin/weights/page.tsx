'use client';
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

type Weight = { id: number; aspect_name: string; role: string; gender: string; max_score: number; };

export default function ManageWeightsPage() {
    const [weights, setWeights] = useState<Weight[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const fetchData = async () => {
        setIsLoading(true);
        const res = await fetch('/api/admin/weights', { cache: 'no-store' });
        setWeights(await res.json());
        setIsLoading(false);
    };

    useEffect(() => { fetchData() }, []);

    const handleScoreChange = (id: number, value: string) => {
        const newScore = parseInt(value, 10);
        if(isNaN(newScore)) return;

        setWeights(currentWeights =>
            currentWeights.map(w => w.id === id ? { ...w, max_score: newScore } : w)
        );
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const response = await fetch('/api/admin/weights', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(weights.map(({id, max_score}) => ({id, max_score}))),
            });

            // Cek jika server merespons dengan error
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Gagal menyimpan perubahan.');
            }

            // Jika berhasil, tampilkan notifikasi sukses
            toast.success("Sukses!", {
                description: "Semua perubahan bobot berhasil disimpan.",
            });

        } catch (error: any) {
            // Jika terjadi error, tampilkan notifikasi gagal
            toast.error("Gagal Menyimpan", {
                description: error.message,
            });
        } finally {
            // Blok ini akan selalu berjalan, baik berhasil maupun gagal
            setIsSaving(false);
        }
    };

    if(isLoading) return <p>Loading data bobot...</p>

    return (
        <div className="space-y-4">
             <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Manajemen Bobot (Nilai Maksimum)</h1>
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? 'Menyimpan...' : 'Simpan Semua Perubahan'}
                </Button>
            </div>

            <Card>
                <CardHeader><CardTitle>Daftar Bobot Penilaian</CardTitle></CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader><TableRow>
                            <TableHead>Aspek Penilaian</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Gender</TableHead>
                            <TableHead className="w-32">Nilai Maksimum</TableHead>
                        </TableRow></TableHeader>
                        <TableBody>{weights.map(w => (
                            <TableRow key={w.id}>
                                <TableCell className="font-medium">{w.aspect_name}</TableCell>
                                <TableCell>{w.role}</TableCell>
                                <TableCell>{w.gender}</TableCell>
                                <TableCell>
                                    <Input
                                        type="number"
                                        value={w.max_score}
                                        onChange={(e) => handleScoreChange(w.id, e.target.value)}
                                    />
                                </TableCell>
                            </TableRow>
                        ))}</TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}