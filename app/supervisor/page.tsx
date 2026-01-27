'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import Image from 'next/image';
import { toast } from "sonner";
import { supabase } from '@/lib/supabaseClient'; // Pastikan path ini benar
import { Loader2 } from 'lucide-react';

// Tipe data
type Supervisor = { id: string; full_name: string; };
type CrewToAssess = { 
    id: string; 
    full_name: string; 
    outlets: { name: string } | null; 
    role: string; 
};

export default function SupervisorPage() {
    const [step, setStep] = useState<'login' | 'form' | 'success'>('login');
    const [supervisorList, setSupervisorList] = useState<Supervisor[]>([]);
    const [selectedSupervisor, setSelectedSupervisor] = useState<Supervisor | null>(null);
    const [crewList, setCrewList] = useState<CrewToAssess[]>([]);
    const [scores, setScores] = useState<Record<string, number | string>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activePeriodName, setActivePeriodName] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                // --- BAGIAN INI SUDAH DIPERBAIKI (TIDAK LAGI PANGGIL API YANG HILANG) ---
                // Kita ambil data langsung dari database Supabase
                const [crewResponse, periodResponse] = await Promise.all([
                    supabase
                        .from('crew')
                        .select('id, full_name, role, outlets(name)')
                        .eq('is_active', true)
                        .order('full_name'),
                    supabase
                        .from('assessment_periods')
                        .select('id, name')
                        .eq('is_active', true)
                        .maybeSingle() 
                ]);

                if (crewResponse.error) throw crewResponse.error;
                
                // Cek Periode
                if (!periodResponse.data) {
                    throw new Error("Tidak ada periode penilaian yang aktif saat ini.");
                }
                setActivePeriodName(periodResponse.data.name);

                // Proses Data Kru
                const allCrewData = crewResponse.data || [];
                
                // Filter Supervisor untuk Dropdown Login
                const supervisors = allCrewData
                    .filter(c => c.role === 'supervisor' || c.role === 'manager') 
                    .map(s => ({ id: s.id, full_name: s.full_name }));

                // Filter Kru untuk Dinilai (Semua selain supervisor/manager)
                const crewToAssess = allCrewData
                    .filter(c => c.role !== 'supervisor' && c.role !== 'manager')
                    .map(c => {
                        // Handle format outlet jika array atau object
                        const outletData = Array.isArray(c.outlets) ? c.outlets[0] : c.outlets;
                        return {
                            id: c.id,
                            full_name: c.full_name,
                            role: c.role,
                            outlets: outletData ? { name: outletData.name } : null
                        };
                    })
                    // Sorting berdasarkan Outlet lalu Nama
                    .sort((a, b) => {
                        const outletA = a.outlets?.name || 'Z';
                        const outletB = b.outlets?.name || 'Z';
                        if (outletA !== outletB) return outletA.localeCompare(outletB);
                        return a.full_name.localeCompare(b.full_name);
                    });

                setSupervisorList(supervisors);
                setCrewList(crewToAssess);

            } catch (error: any) {
                console.error("Fetch Error:", error);
                toast.error("Gagal Memuat Data", { description: error.message });
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleSelectSupervisor = (supervisorId: string) => {
        const selected = supervisorList.find(s => s.id === supervisorId);
        if (selected) {
            setSelectedSupervisor(selected);
            setStep('form');
        }
    };

    const handleScoreChange = (crewId: string, scoreStr: string) => {
        if (scoreStr === '') {
            setScores(prev => ({ ...prev, [crewId]: '' }));
            return;
        }
        const value = parseInt(scoreStr, 10);
        if (!isNaN(value) && value >= 0 && value <= 100) {
            setScores(prev => ({ ...prev, [crewId]: value }));
        }
    };

    const handleSubmit = async () => {
        const filledScores = Object.entries(scores).filter(([_, val]) => val !== '' && val !== null);
        
        if (filledScores.length < crewList.length) {
            toast.warning("Data Belum Lengkap", { description: `Baru terisi ${filledScores.length} dari ${crewList.length} orang.` });
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                supervisor_id: selectedSupervisor?.id,
                scores: filledScores.map(([crewId, score]) => ({
                    assessed_crew_id: crewId,
                    score: Number(score)
                }))
            };

            // PERBAIKAN: Ejaan 'assessment' (double s)
            const response = await fetch('/api/submit-supervisor-assessment', { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            // Baca respons sebagai text untuk diagnosa jika error HTML
            const responseText = await response.text();
            
            let data;
            try {
                data = responseText ? JSON.parse(responseText) : {};
            } catch (e) {
                console.error("Non-JSON Response:", responseText);
                throw new Error(`Server Error (${response.status}): Kemungkinan salah alamat API.`);
            }

            if (!response.ok) {
                throw new Error(data.message || `Gagal menyimpan (${response.status}).`);
            }

            toast.success("Berhasil!", { description: "Penilaian supervisor telah disimpan." });
            setStep('success');

        } catch (error: any) {
            console.error("Submit Error:", error);
            toast.error("Gagal Mengirim", { description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
                <Loader2 className="h-10 w-10 animate-spin text-green-700 mb-4" />
                <p className="text-gray-500">Memuat data tim...</p>
            </div>
        );
    }

    return (
        <div className="flex justify-center items-start min-h-screen py-10 bg-gray-50 px-4">
            <Card className="w-full max-w-3xl shadow-lg border-t-4 border-t-[#033F3F]">
                <CardHeader className="text-center pb-2">
                    <div className="flex justify-center mb-4">
                        <Image src="/logo.png" alt="Balista Logo" width={120} height={60} priority className="h-auto w-auto" />
                    </div>
                    <CardTitle className="text-2xl text-[#033F3F]">Penilaian Supervisor</CardTitle>
                    <CardDescription>
                        Periode: <span className="font-semibold text-black">{activePeriodName}</span>
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    {step === 'login' && (
                        <div className="space-y-4 max-w-md mx-auto">
                            <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800 text-center mb-6">
                                Pilih nama Anda untuk memulai.
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Nama Supervisor / Manager</label>
                                <Select onValueChange={handleSelectSupervisor}>
                                    <SelectTrigger className="h-12 text-base">
                                        <SelectValue placeholder="-- Pilih Nama Anda --" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {supervisorList.map((s) => (
                                            <SelectItem key={s.id} value={s.id} className="py-3 cursor-pointer">
                                                {s.full_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}
                    {step === 'form' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between bg-gray-100 p-3 rounded-md text-sm">
                                <span>Penilai: <strong>{selectedSupervisor?.full_name}</strong></span>
                                <span className="text-gray-500">{crewList.length} Orang Dinilai</span>
                            </div>
                            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                                {crewList.map((crew, index) => (
                                    <div key={crew.id} className={`flex flex-col sm:flex-row items-center justify-between p-4 rounded-lg border ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:border-green-300 transition-colors`}>
                                        <div className="w-full sm:w-2/3 mb-3 sm:mb-0">
                                            <div className="flex items-center gap-2">
                                                <p className="font-semibold text-gray-800">{crew.full_name}</p>
                                                {crew.role === 'leader' && <span className="text-[10px] bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full font-bold">LEADER</span>}
                                            </div>
                                            <p className="text-xs text-gray-500 uppercase tracking-wide mt-1">
                                                {crew.outlets?.name || 'NO OUTLET'}
                                            </p>
                                        </div>
                                        <div className="w-full sm:w-auto flex items-center gap-2">
                                            <Input
                                                type="number"
                                                inputMode="numeric"
                                                placeholder="0-100"
                                                className={`w-full sm:w-24 text-center font-bold h-12 ${scores[crew.id] ? 'border-green-500 bg-green-50' : ''}`}
                                                value={scores[crew.id] ?? ''}
                                                onChange={(e) => handleScoreChange(crew.id, e.target.value)}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full bg-[#033F3F] hover:bg-[#022020] h-12 text-lg font-medium">
                                {isSubmitting ? (<><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Menyimpan...</>) : ('Kirim Hasil Penilaian')}
                            </Button>
                        </div>
                    )}
                    {step === 'success' && (
                        <div className="text-center py-12 space-y-4">
                            <h2 className="text-2xl font-bold text-gray-800">Terima Kasih!</h2>
                            <p>Data berhasil disimpan.</p>
                            <Button variant="outline" onClick={() => window.location.reload()}>Kembali</Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};