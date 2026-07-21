'use client';
import { useEffect, useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { exportToPdf } from '@/lib/pdfGenerator';
import { Progress } from "@/components/ui/progress";
import { AspectChart } from '@/components/charts/AspectChart';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';

// Tipe data yang sudah diperbarui dengan field status penilaian
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
    totalPotentialAssessors: number; 
    actualAssessorsCount: number;
    targetAssessmentsToSubmit: number; 
    submittedAssessmentsCount: number;
    submissionStatus: 'none' | 'partial' | 'completed';
};

const aspectDisplayNames: { [key: string]: string } = { 
    leadership: "Kepemimpinan", preparation: "Persiapan", cashier: "Penerimaan", 
    order_making: "Pembuatan", packing: "Pengemasan", stock_opname: "Stock Opname", cleanliness: "Kebersihan" 
};
const aspectOrder = ["leadership", "preparation", "cashier", "order_making", "packing", "stock_opname", "cleanliness"];

const getScoreColorClass = (aspectData?: { score: number; max_score: number }): string => {
    if (!aspectData || aspectData.max_score === 0) return 'bg-gray-100';
    const percentage = (aspectData.score / aspectData.max_score) * 100;
    if (percentage >= 75) return 'bg-teal-100 text-teal-800';
    if (percentage >= 50) return 'bg-green-100 text-green-800';
    return 'bg-yellow-100 text-yellow-800';
};

export default function AdminDashboard() {
    const [recapData, setRecapData] = useState<RecapData[]>([]);
    const [chartData, setChartData] = useState<any>(null);
    const [activePeriodName, setActivePeriodName] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // State untuk menampung data debug dari API
    const [debugInfo, setDebugInfo] = useState<any>(null);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const res = await fetch('/api/admin/full-recap', { cache: 'no-store' });
                if (!res.ok) {
                    const errorData = await res.json();
                    throw new Error(errorData.message || "Gagal memuat data rekapitulasi.");
                }
                const data = await res.json();
                setRecapData(data.recapData || []);
                setChartData(data.chartData || {});
                setActivePeriodName(data.activePeriodName || "Tidak Ada Periode Aktif");
                
                // Menyimpan data debug untuk ditampilkan di panel bawah
                setDebugInfo(data.debugInfo || null);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    // Hitung rata-rata nilai akhir semua kru
    const averageFinalScore = useMemo(() => {
        if (recapData.length === 0) return 0;
        const totalScore = recapData.reduce((sum, crew) => sum + crew.totalNilaiAkhir, 0);
        return totalScore / recapData.length;
    }, [recapData]);

    if (isLoading) return <div className="text-center p-10 font-medium">Memuat data rekapitulasi...</div>;
    if (error) return <div className="text-center p-10 text-red-500 font-medium">Error: {error}</div>;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                    <p className="text-gray-500">Rekapitulasi Penilaian Periode: <strong>{activePeriodName}</strong></p>
                </div>
                <div>
                    <Button onClick={async () => await exportToPdf(
                        recapData.map((recap, idx) => ({
                            ...recap,
                            rank: recap.rank ?? idx + 1,
                            name: recap.nama,
                            aspect_scores: recap.aspectScores,
                            bonusStatus: recap.bonusStatus,
                        })),
                        [],
                        activePeriodName
                    )}>Export ke PDF</Button>
                </div>
            </div>
            
            {/* Accordion Utama */}
            <Accordion type="multiple" className="w-full space-y-4" defaultValue={['peringkat', 'performa']}>
                
                {/* 1. BAGIAN TABEL PERINGKAT */}
                <AccordionItem value="peringkat" className="border rounded-lg bg-white">
                    <AccordionTrigger className="text-xl font-bold px-6 hover:no-underline">
                        Peringkat Kinerja Kru
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-6">
                        <div className="w-full overflow-x-auto border rounded-md">
                            <Table>
                                <TableHeader className="bg-gray-50">
                                    <TableRow>
                                        <TableHead className="w-[60px] text-center font-bold">Rank</TableHead>
                                        <TableHead className="min-w-[200px] font-bold">Nama Kru & Status Penilaian</TableHead>
                                        {aspectOrder.map(key => (
                                            <TableHead key={key} className="text-center font-bold">
                                                {aspectDisplayNames[key]}
                                            </TableHead>
                                        ))}
                                        <TableHead className="text-center font-bold">Total Kru</TableHead>
                                        <TableHead className="text-center font-bold">Spv 1</TableHead>
                                        <TableHead className="text-center font-bold">Spv 2</TableHead>
                                        <TableHead className="text-center font-extrabold text-lg text-primary">Nilai Akhir</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {recapData.map((recap) => (
                                        <TableRow key={recap.id} className="hover:bg-slate-50 transition-colors">
                                            <TableCell className="font-bold text-center text-lg">{recap.rank}</TableCell>
                                            <TableCell>
                                                <div className="font-bold text-base">{recap.nama}</div>
                                                <div className="text-xs text-muted-foreground mb-2">{recap.outlet} <span className="capitalize">({recap.role})</span></div>
                                                
                                                {/* WARNING STATUS PENILAIAN */}
                                                <div className="mb-2 flex flex-col gap-1 items-start">
                                                    {recap.submissionStatus === 'none' && (
                                                        <span className="inline-flex items-center text-[11px] font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded-md border border-red-200">
                                                            <AlertCircle className="w-3 h-3 mr-1" />
                                                            Belum Menilai ({recap.submittedAssessmentsCount}/{recap.targetAssessmentsToSubmit})
                                                        </span>
                                                    )}
                                                    {recap.submissionStatus === 'partial' && (
                                                        <span className="inline-flex items-center text-[11px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200">
                                                            <AlertTriangle className="w-3 h-3 mr-1" />
                                                            Belum Selesai ({recap.submittedAssessmentsCount}/{recap.targetAssessmentsToSubmit})
                                                        </span>
                                                    )}
                                                    {recap.submissionStatus === 'completed' && recap.targetAssessmentsToSubmit > 0 && (
                                                        <span className="inline-flex items-center text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200">
                                                            <CheckCircle2 className="w-3 h-3 mr-1" />
                                                            Selesai Menilai ({recap.submittedAssessmentsCount}/{recap.targetAssessmentsToSubmit})
                                                        </span>
                                                    )}
                                                </div>

                                                {/* PROGRESS BAR (Penilaian Diterima dari orang lain) */}
                                                {recap.totalPotentialAssessors > 0 && (
                                                    <div className="mt-2 w-32 border-t pt-1">
                                                        <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                                                            <span>Dinilai oleh:</span>
                                                            <span className="font-medium">{recap.actualAssessorsCount} / {recap.totalPotentialAssessors}</span>
                                                        </div>
                                                        <Progress value={(recap.actualAssessorsCount / recap.totalPotentialAssessors) * 100} className="h-1.5" />
                                                    </div>
                                                )}
                                            </TableCell>
                                            {aspectOrder.map(key => (
                                                <TableCell key={key} className="text-center">
                                                    {recap.role === 'crew' && key === 'leadership' ? '-' : (
                                                        <span className={`inline-block px-2 py-1 rounded font-semibold text-sm ${getScoreColorClass(recap.aspectScores[key])}`}>
                                                            {recap.aspectScores[key]?.score?.toFixed(1) || '-'}
                                                        </span>
                                                    )}
                                                </TableCell>
                                            ))}
                                            <TableCell className="text-center font-bold">{recap.totalNilaiCrew.toFixed(2)}</TableCell>
                                            <TableCell className="text-center font-medium">{recap.nilaiSupervisor1 > 0 ? recap.nilaiSupervisor1 : '-'}</TableCell>
                                            <TableCell className="text-center font-medium">{recap.nilaiSupervisor2 > 0 ? recap.nilaiSupervisor2 : '-'}</TableCell>
                                            <TableCell className="text-center font-black text-lg text-primary">{recap.totalNilaiAkhir.toFixed(2)}</TableCell>
                                        </TableRow>
                                    ))}
                                    
                                    {recapData.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={13} className="text-center py-8 text-gray-500">
                                                Tidak ada data evaluasi kru yang ditemukan untuk periode ini.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                                
                                <TableFooter className="bg-gray-50 border-t-2">
                                    <TableRow>
                                        <TableCell colSpan={12} className="text-right font-bold text-lg">Rata-rata Nilai Akhir Semua Kru</TableCell>
                                        <TableCell className="text-center font-black text-xl text-primary">{averageFinalScore.toFixed(2)}</TableCell>
                                    </TableRow>
                                </TableFooter>
                            </Table>
                        </div>
                    </AccordionContent>
                </AccordionItem>

                {/* 2. BAGIAN CHART PERFORMA */}
                <AccordionItem value="performa" className="border rounded-lg bg-white">
                     <AccordionTrigger className="text-xl font-bold px-6 hover:no-underline">
                        Top 3 Performa Aspek Terbaik
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-6 pt-2">
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {chartData && Object.keys(chartData).length > 0 && aspectOrder.map(key => (
                                <div key={key} className="border rounded-lg p-1 bg-slate-50/50">
                                    <AspectChart 
                                        title={aspectDisplayNames[key]} 
                                        data={chartData[key]}
                                    />
                                </div>
                            ))}
                        </div>
                    </AccordionContent>
                </AccordionItem>

                {/* 3. BAGIAN DEBUGGING PANEL (Hanya muncul jika ada data debug) */}
                {debugInfo && (
                    <AccordionItem value="debugging" className="border-2 border-red-200 rounded-lg bg-red-50 mt-8">
                        <AccordionTrigger className="text-lg font-bold px-6 text-red-700 hover:no-underline">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5" />
                                System Debugging Panel (Cek Data Masuk)
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-6 pb-6">
                            <div className="space-y-6 font-mono text-sm text-slate-800">
                                
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 bg-white p-4 rounded border border-red-200">
                                    <div className="col-span-2 md:col-span-1"><strong>Period ID Aktif:</strong> <br/><span className="text-xs text-gray-500 break-all">{debugInfo.periodId}</span></div>
                                    <div><strong>Total Kru (Aktif):</strong> <br/><span className="text-lg font-bold">{debugInfo.totalCrewActiveFetched}</span> orang</div>
                                    <div><strong>Total Form Ditarik:</strong> <br/><span className="text-lg font-bold text-blue-600">{debugInfo.totalAssessmentsFetched}</span> form</div>
                                    <div><strong>Total Form (SPV):</strong> <br/><span className="text-lg font-bold">{debugInfo.totalSpvAssessmentsFetched}</span> form</div>
                                    <div><strong>Baris Bobot Nilai:</strong> <br/><span className="text-lg font-bold">{debugInfo.totalWeightsFetched}</span> baris</div>
                                </div>

                                {/* WARNING: Jika ada form yang tidak masuk periode mana pun */}
                                {debugInfo.nullPeriodCount > 0 && (
                                    <div className="bg-red-100 text-red-900 p-4 rounded border border-red-400 font-bold">
                                        ⚠️ BAHAYA: Ada {debugInfo.nullPeriodCount} Form Penilaian di Database yang tidak terhubung ke Periode manapun (period_id kosong/null)! Form ini tidak akan pernah muncul di dashboard. Silakan periksa halaman input form penilaian Anda.
                                    </div>
                                )}

                                {/* PELACAKAN RAW DATA: SIAPA MENILAI SIAPA */}
                                <div className="border border-red-200 rounded-lg overflow-hidden bg-white">
                                    <div className="bg-red-100 px-4 py-2 font-bold text-red-800">
                                        Lacak Form Masuk Berdasarkan Periode Aktif
                                    </div>
                                    <div className="p-4 bg-gray-50 text-xs mb-2">
                                        Jika di database ada 4 form, tapi di sini cuma terdaftar 1 form, berarti 3 form lainnya tersimpan di <strong>Periode yang Salah</strong> atau <strong>period_id-nya Kosong</strong>.
                                    </div>
                                    <div className="max-h-80 overflow-y-auto">
                                        <Table>
                                            <TableHeader className="bg-gray-100 sticky top-0">
                                                <TableRow>
                                                    <TableHead className="font-bold text-black w-1/3">Nama Kru (Yang Dinilai)</TableHead>
                                                    <TableHead className="font-bold text-black w-[150px] text-center">Total Form Ditarik</TableHead>
                                                    <TableHead className="font-bold text-black">Daftar Orang Yang Menilai</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {Object.entries(debugInfo.rawAssessmentTracking || {}).map(([assessedName, assessors]: [string, any]) => (
                                                    <TableRow key={assessedName}>
                                                        <TableCell className="font-bold">{assessedName}</TableCell>
                                                        <TableCell className="text-center font-bold text-blue-600 bg-blue-50">
                                                            {assessors.length}
                                                        </TableCell>
                                                        <TableCell className="leading-relaxed">
                                                            {assessors.join(', ')}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                                {Object.keys(debugInfo.rawAssessmentTracking || {}).length === 0 && (
                                                    <TableRow>
                                                        <TableCell colSpan={3} className="text-center py-4 text-gray-500">Belum ada satupun form penilaian yang masuk untuk periode ini.</TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>

                                {/* WARNING: BOBOT (Sudah ada dari kode sebelumnya) */}
                                {debugInfo.missingWeightKeys && debugInfo.missingWeightKeys.length > 0 && (
                                    <div className="bg-orange-50 text-orange-900 p-4 rounded border border-orange-300">
                                        <h4 className="font-bold mb-2 text-orange-700 flex items-center gap-2">
                                            <AlertCircle className="w-4 h-4" /> 
                                            Ada Bobot Aspek yang Hilang!
                                        </h4>
                                        <ul className="list-disc pl-5 space-y-1 text-xs">
                                            {debugInfo.missingWeightKeys.map((key: string) => (
                                                <li key={key} className="font-bold">{key}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                            </div>
                        </AccordionContent>
                    </AccordionItem>
                )}
            </Accordion>
        </div>
    );
}
