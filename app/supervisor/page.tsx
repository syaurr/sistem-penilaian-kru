'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import Image from 'next/image';
import { toast } from "sonner";
import { supabase } from '@/lib/supabaseClient';

// Tipe data (tidak berubah)
type Supervisor = { id: string; full_name: string; };
type CrewToAssess = { id: string; full_name: string; outlets: { name: string } | null; role: string; };

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
                // Ambil semua data crew (termasuk supervisor) dan periode aktif
                const [crewResponse, periodResponse] = await Promise.all([
                    supabase.from('crew').select('id, full_name, role, outlets(name)').eq('is_active', true).order('full_name'),
                    supabase.from('assessment_periods').select('name').eq('is_active', true).single()
                ]);

                const { data: allCrewData, error: crewError } = crewResponse;
                const { data: periodData, error: periodError } = periodResponse;

                if (crewError) throw new Error("Gagal mengambil data kru.");
                if (periodError) throw new Error("Tidak ada periode penilaian yang aktif.");

                if (allCrewData) {
                    // Pisahkan data supervisor dan kru yang akan dinilai
                    const supervisors = allCrewData.filter(c => c.role === 'supervisor');
                    const crewToAssess = allCrewData.filter(c => c.role !== 'supervisor');

                    // Logika Sorting Kru
                    crewToAssess.sort((a, b) => {
                        const outletA = (a.outlets as any)?.name || '';
                        const outletB = (b.outlets as any)?.name || '';
                        if (outletA < outletB) return -1;
                        if (outletA > outletB) return 1;
                        if (a.role === 'leader' && b.role !== 'leader') return -1;
                        if (a.role !== 'leader' && b.role === 'leader') return 1;
                        if (a.full_name < b.full_name) return -1;
                        if (a.full_name > b.full_name) return 1;
                        return 0;
                    });
                    
                    // PERBAIKAN UTAMA: Pastikan state di-update dengan benar
                    setSupervisorList(supervisors);
                    setCrewList(
                        crewToAssess.map(c => ({
                            ...c,
                            outlets: Array.isArray(c.outlets) 
                                ? (c.outlets[0] ? { name: c.outlets[0].name } : null)
                                : c.outlets
                        }))
                    );
                }

                setActivePeriodName(periodData?.name || 'Tidak Diketahui');

            } catch (error: any) {
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

    const handleScoreChange = (crewId: string, score: string) => {
        const value = parseInt(score, 10);
        if (value >= 0 && value <= 100) {
            setScores(prev => ({ ...prev, [crewId]: value }));
        } else if (score === '') {
             setScores(prev => ({ ...prev, [crewId]: '' }));
        }
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const scoresToSubmit = Object.entries(scores).filter(([_, score]) => score !== '' && score !== null).map(([crewId, score]) => ({ assessed_crew_id: crewId, score: Number(score) }));
            if(scoresToSubmit.length !== crewList.length){ throw new Error('Harap isi semua nilai kru sebelum mengirim.'); }
            const response = await fetch('/api/submit-supervisor-assessment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ supervisor_id: selectedSupervisor?.id, scores: scoresToSubmit })
            });
            if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.message || "Gagal menyimpan penilaian."); }
            toast.success("Penilaian Supervisor Berhasil!", { description: "Semua data nilai telah berhasil disimpan." });
            setStep('success');
        } catch (error: any) {
            toast.error("Gagal Mengirim", { description: error.message, });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    if (isLoading) return <div className="text-center p-10">Memuat data...</div>;

    return (
        <div className="flex justify-center items-start min-h-screen py-10 bg-gray-50">
            <Card className="w-full max-w-2xl shadow-lg">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <Image src="/logo.png" alt="Balista Logo" width={100} height={50} priority />
                    </div>
                    <CardTitle>Form Penilaian Supervisor</CardTitle>
                    <CardDescription>Periode Penilaian: <strong>{activePeriodName}</strong></CardDescription>
                </CardHeader>
                <CardContent>
                    {step === 'login' && (
                        <div>
                            <p className="text-center mb-4 text-sm text-gray-600">Silakan pilih nama Anda untuk memulai.</p>
                             <Select onValueChange={handleSelectSupervisor}>
                                <SelectTrigger><SelectValue placeholder="-- Pilih Nama Anda --" /></SelectTrigger>
                                <SelectContent>{supervisorList.map((s) => (<SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>))}</SelectContent>
                            </Select>
                        </div>
                    )}
                    {step === 'form' && (
                        <div className="space-y-4">
                            <p className="text-center text-sm">Anda mengisi sebagai: <strong>{selectedSupervisor?.full_name}</strong>. Mohon berikan nilai antara 1-100.</p>
                            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-3 border-t border-b py-4">
                            {crewList.map(crew => (
                                <div key={crew.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 gap-3 bg-gray-50 rounded-md">
                                    <div>
                                        <p className="font-medium">{crew.full_name}</p>
                                        <p className="text-xs text-gray-500">{crew.outlets?.name || 'Outlet tidak diketahui'}</p>
                                    </div>
                                    <Input
                                        type="number" min="0" max="100"
                                        className="w-full sm:w-24"
                                        value={scores[crew.id] || ''}
                                        onChange={(e) => handleScoreChange(crew.id, e.target.value)}
                                    />
                                </div>
                            ))}
                            </div>
                            <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full">
                                {isSubmitting ? 'Menyimpan...' : 'Kirim Semua Penilaian'}
                            </Button>
                        </div>
                    )}
                     {step === 'success' && (
                        <div className="text-center space-y-4 py-8">
                            <h2 className="text-2xl font-bold text-green-600">Penilaian Terkirim!</h2>
                            <p>Data berhasil disimpan. Terima kasih.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}