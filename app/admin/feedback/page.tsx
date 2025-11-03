// admin/feedback/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react'; // Tambahkan useCallback
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// (Tipe RecapData tidak berubah)
type RecapData = {
    periodName: string;
    systemRecap: { averageScore: number; totalResponses: number };
    hrRecap: { averageScore: number; totalResponses: number };
    messages: { id: number; message: string; category: string | null }[];
};

// (Tipe Period tidak berubah)
type Period = {
    id: number;
    name: string;
    is_active: boolean;
};

// (Tipe categoryColors tidak berubah)
const categoryColors: { [key: string]: string } = {
    'Pesan': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'Masukan': 'bg-blue-100 text-blue-800 border-blue-200',
};

export default function FeedbackRecapPage() {
    const [data, setData] = useState<RecapData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [periodsList, setPeriodsList] = useState<Period[]>([]);
    const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');

    // --- REFAKTOR DIMULAI DI SINI ---

    // 1. Definisikan fetchData sebagai fungsi terpisah
    // Kita gunakan useCallback agar fungsi ini stabil
    const fetchData = useCallback(async (periodId: string) => {
        // Jangan jalankan jika belum ada periode yg dipilih
        if (!periodId) {
            setIsLoading(false); // Pastikan loading berhenti jika tidak ada ID
            return;
        }

        setIsLoading(true);
        setData(null); // Kosongkan data lama saat memuat data baru
        
        try {
            const res = await fetch(`/api/admin/feedback-recap?period_id=${periodId}`);
            if (!res.ok) {
                 // Coba baca pesan error dari server
                const errorData = await res.json();
                throw new Error(errorData.message || 'Gagal memuat data rekapitulasi');
            }
            const result: RecapData = await res.json();
            setData(result);
        } catch (error: any) {
            toast.error('Error', { description: error.message });
            setData(null); // Pastikan data kosong jika error
        } finally {
            setIsLoading(false);
        }
    }, []); // Dependensi kosong, fungsi ini tidak perlu dibuat ulang

    // EFEK 1: Mengambil daftar periode (Tidak Berubah)
    useEffect(() => {
        const fetchPeriods = async () => {
            setIsLoading(true); // Mulai loading utama di sini
            try {
                const res = await fetch('/api/admin/periods');
                if (!res.ok) throw new Error('Gagal memuat daftar periode');
                const periods: Period[] = await res.json();
                
                setPeriodsList(periods);

                if (periods.length > 0) {
                    const activePeriod = periods.find(p => p.is_active);
                    if (activePeriod) {
                        setSelectedPeriodId(activePeriod.id.toString());
                    } else {
                        setSelectedPeriodId(periods[0].id.toString());
                    }
                } else {
                    // Tidak ada periode sama sekali
                    toast.warning('Tidak ditemukan periode penilaian.');
                    setIsLoading(false); // Berhenti loading jika tidak ada periode
                }
            } catch (error: any) {
                toast.error('Error', { description: error.message });
                setIsLoading(false);
            }
        };
        
        fetchPeriods();
    }, []); // [] = Hanya berjalan sekali

    // EFEK 2: Mengambil data rekapitulasi (Sekarang memanggil fungsi fetchData)
    useEffect(() => {
        fetchData(selectedPeriodId);
    }, [selectedPeriodId, fetchData]); // Dependensi: selectedPeriodId dan fetchData
    
    // --- REFAKTOR SELESAI ---


    // (Fungsi handleCategoryChange sekarang menggunakan fetchData)
    const handleCategoryChange = async (id: number, newCategory: string) => {
        // Simpan data lama untuk revert manual jika perlu
        const oldData = data; 
        
        // Optimistic update
        setData(prevData => {
            if (!prevData) return null;
            return {
                ...prevData,
                messages: prevData.messages.map(msg => 
                    msg.id === id ? { ...msg, category: newCategory } : msg
                )
            };
        });

        // Update database
        try {
            const response = await fetch('/api/admin/update-feedback-category', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, category: newCategory })
            });

            if (!response.ok) throw new Error('Gagal update kategori');
            toast.success('Kategori berhasil diperbarui');
        } catch (error: any) {
            toast.error('Update Gagal', { description: error.message });
            
            // --- INI KODE YANG BENAR ---
            // Revert UI on failure
            toast.info('Mengembalikan data ke kondisi semula...');
            // Cara 1: Revert manual (lebih cepat)
            setData(oldData);
            
            // Cara 2: Panggil ulang fetch (lebih aman, tapi me-refresh semua data)
            // if (selectedPeriodId) {
            //     fetchData(selectedPeriodId); 
            // }
        }
    };

    // (Logika chartData tidak berubah)
    const chartData = [
        { name: 'Sistem & Tampilan', 'Rata-rata Skor': data?.systemRecap.averageScore || 0 },
        { name: 'Performa Tim HR', 'Rata-rata Skor': data?.hrRecap.averageScore || 0 }
    ];

    const chartColors = ['#8884d8', '#82ca9d'];
    
    // --- KONDISI LOADING YANG LEBIH BAIK ---
    
    // Tampilkan loading jika sedang mengambil daftar periode ATAU mengambil data
    if (isLoading) {
        return <div className="p-6">Loading...</div>;
    }

    // Tampilkan pesan jika tidak ada periode sama sekali
    if (periodsList.length === 0) {
        return <div className="p-6">Tidak ada periode penilaian untuk ditampilkan.</div>;
    }
    
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <h1 className="text-3xl font-bold">
                    Rekapitulasi Feedback {data ? `- ${data.periodName}` : ''}
                </h1>
                
                <div className="w-full sm:w-[250px]">
                    <Select
                        value={selectedPeriodId}
                        onValueChange={(value) => setSelectedPeriodId(value)}
                        disabled={periodsList.length === 0} // Nonaktifkan jika tidak ada periode
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Pilih Periode..." />
                        </SelectTrigger>
                        <SelectContent>
                            {periodsList.map((period) => (
                                <SelectItem key={period.id} value={period.id.toString()}>
                                    {period.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Tampilkan data hanya jika 'data' ada dan 'isLoading' false */}
            {!data ? (
                 <div className="text-center text-muted-foreground">
                    Tidak ada data feedback untuk periode ini.
                 </div>
            ) : (
                <>
                    <Card>
                        <CardHeader><CardTitle>Rata-rata Skor Penilaian (Skala 1-5)</CardTitle></CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground mb-4">Total Responden: {data.systemRecap.totalResponses}</p>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
                                    <XAxis type="number" domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} />
                                    <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 14 }} />
                                    <Tooltip cursor={{ fill: '#f5f5f5' }} />
                                    <Bar dataKey="Rata-rata Skor" barSize={40}>
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Saran & Masukan untuk Tim HR</CardTitle></CardHeader>
                        <CardContent>
                            <Table className="table-fixed w-full">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[50px]">No.</TableHead>
                                        <TableHead className="w-[85%]">Saran & Masukan</TableHead>
                                        <TableHead className="w-[160px]">Kategori</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.messages.length > 0 ? (
                                        data.messages.map((item, index) => (
                                            <TableRow key={item.id}>
                                                <TableCell>{index + 1}</TableCell>
                                                <TableCell className="whitespace-normal break-words">
                                                    {item.message}
                                                </TableCell>
                                                <TableCell>
                                                    <Select
                                                        value={item.category || ''}
                                                        onValueChange={(value) => handleCategoryChange(item.id, value)}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue asChild>
                                                                {item.category ? (
                                                                    <Badge variant="outline" className={cn("font-semibold", categoryColors[item.category])}>
                                                                        {item.category}
                                                                    </Badge>
                                                                ) : (
                                                                    <span className="text-muted-foreground">Pilih Kategori...</span>
                                                                )}
                                                            </SelectValue>
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="Pesan">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                                                                    Pesan
                                                                </div>
                                                            </SelectItem>
                                                            <SelectItem value="Masukan">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                                                                    Masukan
                                                                </div>
                                                            </SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center text-muted-foreground">
                                                Tidak ada pesan atau masukan.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}