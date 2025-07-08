'use client';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { exportToPdf } from '@/lib/pdfGenerator';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

// Tipe data yang BENAR dan SINKRON dengan API
type RecapData = {
    id: string;
    nama: string;
    outlet: string;
    role: string;
    aspectScores: { [key: string]: { score: number; max_score: number; } };
    totalNilaiCrew: number;
    nilaiSupervisor1: number;
    nilaiSupervisor2: number;
    totalNilaiAkhir: number;
    rank: number;
    bonusStatus: string;
};

const aspectDisplayNames: { [key: string]: string } = { leadership: "Kepemimpinan", preparation: "Persiapan", cashier: "Penerimaan", order_making: "Pembuatan", packing: "Pengemasan", stock_opname: "Stock Opname", cleanliness: "Kebersihan" };
const aspectOrder = ["leadership", "preparation", "cashier", "order_making", "packing", "stock_opname", "cleanliness"];

export default function HistoricalRecapPage({ params }: { params: { periodId: string } }) {
    const [recapData, setRecapData] = useState<RecapData[]>([]);
    const [periodName, setPeriodName] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!params.periodId) return;
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const res = await fetch(`/api/admin/full-recap?periodId=${params.periodId}`, { cache: 'no-store' });
                if (!res.ok) throw new Error("Gagal memuat data rekapitulasi historis.");
                const data = await res.json();
                setRecapData(data.recapData);
                setPeriodName(data.activePeriodName);
            } catch (error) {
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [params.periodId]);

    if (isLoading) return <div className="text-center p-10">Memuat data rekapitulasi historis...</div>;

    return (
        <div className="space-y-4">
            <Link href="/admin/periods" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-black">
                <ArrowLeft className="h-4 w-4" />
                Kembali ke Manajemen Periode
            </Link>
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pt-2">
                <div>
                    <h1 className="text-3xl font-bold">Rekapitulasi Historis</h1>
                    <p className="text-gray-500">Menampilkan hasil untuk periode: <strong>{periodName}</strong></p>
                </div>
                <div>
                     <Button
                        onClick={async () =>
                            await exportToPdf(
                                recapData.map((recap, idx) => ({
                                    ...recap,
                                    rank: recap.rank ?? idx + 1,
                                    name: recap.nama,
                                    aspect_scores: recap.aspectScores,
                                    bonusStatus: recap.bonusStatus,
                                })),
                                aspectOrder.map(k => ({ key: k, name: aspectDisplayNames[k] })),
                                periodName
                            )
                        }
                    >
                        Export ke PDF
                    </Button>
                </div>
            </div>
            
            <Card>
                <CardHeader><CardTitle>Peringkat Kinerja Kru - {periodName}</CardTitle></CardHeader>
                <CardContent>
                    <div className="w-full overflow-x-auto rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]">Peringkat</TableHead>
                                    <TableHead>Nama Kru - Outlet</TableHead>
                                    {aspectOrder.map(key => (<TableHead key={key} className="text-center">{aspectDisplayNames[key]}</TableHead>))}
                                    <TableHead className="text-center font-bold">Total Kru</TableHead>
                                    <TableHead className="text-center">Spv 1</TableHead>
                                    <TableHead className="text-center">Spv 2</TableHead>
                                    <TableHead className="text-center font-extrabold text-lg">Nilai Akhir</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {recapData.map((recap, index) => (
                                    <TableRow key={recap.id}>
                                        <TableCell className="font-bold text-center">{recap.rank}</TableCell>
                                        <TableCell>
                                            <div className="font-medium">{recap.nama}</div>
                                            <div className="text-xs text-muted-foreground">{recap.outlet}</div>
                                        </TableCell>
                                        {aspectOrder.map(key => (
                                            <TableCell key={key} className="text-center">
                                                {recap.role === 'crew' && key === 'leadership' ? '-' : (recap.aspectScores[key]?.score?.toFixed(1) || '-')}
                                            </TableCell>
                                        ))}
                                        <TableCell className="text-center font-bold">{recap.totalNilaiCrew.toFixed(2)}</TableCell>
                                        <TableCell className="text-center">{recap.nilaiSupervisor1 > 0 ? recap.nilaiSupervisor1 : '-'}</TableCell>
                                        <TableCell className="text-center">{recap.nilaiSupervisor2 > 0 ? recap.nilaiSupervisor2 : '-'}</TableCell>
                                        <TableCell className="text-center font-extrabold text-lg text-primary">{recap.totalNilaiAkhir.toFixed(2)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}