'use client';

import { useEffect, useState, useCallback, use } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Star, Mail, Loader2, Users, Briefcase, BadgeCheck, ChevronLeft, ChevronRight, CheckCircle2, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import ReactMarkdown from 'react-markdown';

// Types
type Outlet = { id: string; name: string; outlet_code: string; area_type: string; };
type CrewMember = { id: string; full_name: string; role: 'crew' | 'leader'; gender: 'male' | 'female'; };
type Assessor = { id: string; full_name: string; code: string; };
type Aspect = { aspect_key: string; aspect_name: string; };
type AspectDesc = { id: number; aspect_key: string; area_type: string; target_role: string; description_text: string; };

type Step = 'welcome' | 'selectAssessor' | 'selectAssessed' | 'rating' | 'success';

// ─── Framer Motion Variants ───
const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
};

// ─── Rating Card Component (Isolated for perf) ───
function RatingCard({ value, selected, onSelect }: { value: number; selected: boolean; onSelect: () => void }) {
    const labels = ['', 'Sangat Kurang', 'Kurang', 'Cukup', 'Baik', 'Sangat Baik'];
    const colors = ['', 'bg-red-500', 'bg-orange-400', 'bg-yellow-400', 'bg-emerald-400', 'bg-emerald-600'];
    const emojis = ['', '😞', '😕', '😐', '😊', '🤩'];

    return (
        <motion.button
            type="button"
            onClick={onSelect}
            whileTap={{ scale: 0.92 }}
            whileHover={{ scale: 1.05 }}
            className={`
                relative flex flex-col items-center justify-center gap-1
                w-full aspect-square rounded-2xl border-2 transition-colors
                ${selected
                    ? `${colors[value]} border-transparent text-white shadow-lg shadow-[${colors[value]}]/30`
                    : 'bg-white border-gray-200 hover:border-[#033F3F]/40 text-gray-700'
                }
            `}
        >
            <span className="text-2xl sm:text-3xl">{emojis[value]}</span>
            <span className="text-[11px] sm:text-xs font-bold leading-tight text-center px-1">{labels[value]}</span>
            <span className={`text-lg font-black ${selected ? 'text-white' : 'text-gray-400'}`}>{value}</span>
        </motion.button>
    );
}

// ─── Wizard Progress Bar ───
function WizardProgress({ current, total }: { current: number; total: number }) {
    const pct = ((current + 1) / total) * 100;
    return (
        <div className="w-full mb-4">
            <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs font-semibold text-[#033F3F]">Aspek {current + 1} dari {total}</span>
                <span className="text-xs font-bold text-[#033F3F]">{Math.round(pct)}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                    className="h-full bg-gradient-to-r from-[#033F3F] to-emerald-500 rounded-full"
                    animate={{ width: `${pct}%` }}
                    transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                />
            </div>
        </div>
    );
}

export default function AssessmentPage({ params }: { params: Promise<{ outletCode: string }> }) {
    const { outletCode } = use(params);

    // UI states
    const [step, setStep] = useState<Step>('welcome');
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Data states
    const [outlet, setOutlet] = useState<Outlet | null>(null);
    const [allCrew, setAllCrew] = useState<CrewMember[]>([]);
    const [descriptions, setDescriptions] = useState<AspectDesc[]>([]);
    const [activePeriod, setActivePeriod] = useState<{ id: string, name: string } | null>(null);
    const [tiktokUrl, setTiktokUrl] = useState('');

    // Assessor Info
    const [assessorId, setAssessorId] = useState<string>('');
    const [assessorName, setAssessorName] = useState<string>('');
    const [assessorCode, setAssessorCode] = useState<string>('');

    const [assessed, setAssessed] = useState<CrewMember | null>(null);
    const [remainingToAssess, setRemainingToAssess] = useState<CrewMember[]>([]);
    const [aspects, setAspects] = useState<Aspect[]>([]);
    const [scores, setScores] = useState<Record<string, number>>({});

    // Wizard states
    const [currentAspectIndex, setCurrentAspectIndex] = useState(0);
    const [direction, setDirection] = useState(0);

    // Feedback states
    const [systemRating, setSystemRating] = useState<string | null>(null);
    const [hrRating, setHrRating] = useState<string | null>(null);
    const [feedbackMessage, setFeedbackMessage] = useState('');
    const [hasSubmittedFeedback, setHasSubmittedFeedback] = useState(false);
    const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

    useEffect(() => {
        const fetchInitialData = async () => {
            setIsLoading(true);
            setError('');
            try {
                const [crewRes, periodRes, tiktokRes] = await Promise.all([
                    fetch(`/api/crew/${outletCode}`),
                    fetch('/api/active-period'),
                    fetch('/api/setting?key=tiktok_success_url')
                ]);

                if (!crewRes.ok) throw new Error("Gagal memuat data outlet/kru.");

                const crewData = await crewRes.json();
                setAllCrew(crewData.crew);
                setOutlet(crewData.outlet);

                if (periodRes.ok) {
                    const pData = await periodRes.json();
                    if (pData && pData.id) setActivePeriod(pData);
                }

                if (tiktokRes.ok) {
                    const tData = await tiktokRes.json();
                    if (tData && tData.value) setTiktokUrl(tData.value);
                }

                if (crewData.outlet) {
                    const descRes = await fetch(`/api/aspect-descriptions?area_type=${crewData.outlet.area_type}`);
                    if (descRes.ok) {
                        const descData = await descRes.json();
                        setDescriptions(descData);
                    }
                }
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };
        fetchInitialData();
    }, [outletCode]);

    useEffect(() => {
        const fetchFeedbackHistory = async () => {
            if (step === 'success' && assessorId && activePeriod) {
                try {
                    const res = await fetch(`/api/get-feedback?assessor_id=${assessorId}&period_id=${activePeriod.id}`);
                    if (res.ok) {
                        const history = await res.json();
                        if (history.length > 0) setHasSubmittedFeedback(true);
                    }
                } catch (err) {
                    console.error("Gagal memuat riwayat feedback", err);
                }
            }
        };
        fetchFeedbackHistory();
    }, [step, assessorId, activePeriod]);

    useEffect(() => {
        if (step === 'success') {
            const loadTikTokScript = () => {
                if (window.tiktok && typeof window.tiktok.load === 'function') {
                    window.tiktok.load();
                } else {
                    const script = document.createElement('script');
                    script.src = "https://www.tiktok.com/embed.js";
                    script.async = true;
                    document.body.appendChild(script);
                }
            };
            const timer = setTimeout(loadTikTokScript, 500);
            return () => clearTimeout(timer);
        }
    }, [step]);

    // ─── Handlers ───
    const handleSelectAssessor = async (value: string) => {
        const selected = allCrew.find(c => c.id === value);
        if (selected) {
            setAssessorId(selected.id);
            setAssessorName(selected.full_name);
            setAssessorCode('crew');
            const remaining = allCrew.filter(c => c.id !== selected.id);

            let filteredRemaining = remaining;
            if (activePeriod) {
                try {
                    const historyRes = await fetch(`/api/history?assessor_id=${selected.id}&period_id=${activePeriod.id}`);
                    if (historyRes.ok) {
                        const historyData = await historyRes.json();
                        // API returns plain array of assessed_id strings
                        const alreadyAssessedIds = new Set(historyData);
                        filteredRemaining = remaining.filter(c => !alreadyAssessedIds.has(c.id));
                    }
                } catch { /* fallback to all remaining */ }
            }

            setRemainingToAssess(filteredRemaining);

            // Jika sudah menilai semua, langsung ke halaman selesai
            if (filteredRemaining.length === 0) {
                setStep('success');
            } else {
                setStep('selectAssessed');
            }
        }
    };

    const handleSelectAssessed = async (targetId: string) => {
        const selected = remainingToAssess.find(c => c.id === targetId);
        if (selected) {
            setAssessed(selected);
            setIsLoading(true);
            try {
                const [aspectsRes, descRes] = await Promise.all([
                    fetch(`/api/assessment-aspects?assessor_code=${assessorCode}&role=${selected.role}&gender=${selected.gender}`),
                    fetch(`/api/aspect-descriptions?area_type=${outlet?.area_type}&target_role=${selected.role}`),
                ]);
                const aspectsData = await aspectsRes.json();
                if (!aspectsRes.ok) throw new Error("Gagal mengambil data aspek");

                if (aspectsData.length === 0) {
                    toast.warning("Info", { description: "Asesor ini tidak memiliki aspek penilaian untuk role target." });
                }

                if (descRes.ok) {
                    const descData = await descRes.json();
                    setDescriptions(descData);
                }

                setAspects(aspectsData);
                setScores({});
                setCurrentAspectIndex(0);
                setDirection(0);
                setStep('rating');
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleRatingChange = useCallback((aspect_key: string, value: number) => {
        setScores(prev => ({ ...prev, [aspect_key]: value }));

        // Auto-slide after 400ms delay
        setTimeout(() => {
            setDirection(1);
            setCurrentAspectIndex(prev => {
                const next = prev + 1;
                // If this was the last aspect, stay on last to show "Submit"
                if (next >= aspects.length) return prev;
                return next;
            });
        }, 400);
    }, [aspects.length]);

    const goToAspect = (targetIndex: number) => {
        if (targetIndex < 0 || targetIndex >= aspects.length) return;
        setDirection(targetIndex > currentAspectIndex ? 1 : -1);
        setCurrentAspectIndex(targetIndex);
    };

    const backToSelectCrew = () => {
        setAssessed(null);
        setScores({});
        setAspects([]);
        setCurrentAspectIndex(0);
        setStep('selectAssessed');
    };

    const handleSubmitAssessment = async () => {
        if (!assessed || Object.keys(scores).length !== aspects.length) {
            toast.warning("Form Belum Lengkap", {
                description: "Harap isi semua penilaian sebelum mengirim.",
            });
            return;
        }

        setIsSubmitting(true);
        try {
            if (!activePeriod) throw new Error("Tidak bisa menemukan periode aktif.");

            const response = await fetch('/api/submit-assessment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    period_id: activePeriod.id,
                    assessor_id: assessorId,
                    assessed_id: assessed.id,
                    scores,
                    assessor_code: assessorCode,
                }),
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Gagal menyimpan penilaian.');

            toast.success("Penilaian Berhasil!", {
                description: `Penilaian untuk ${assessed.full_name} telah berhasil disimpan.`,
            });

            const updatedRemaining = remainingToAssess.filter(c => c.id !== assessed.id);
            setRemainingToAssess(updatedRemaining);

            if (updatedRemaining.length === 0) {
                setStep('success');
            } else {
                // Show success animation briefly, then auto-reset
                setStep('success');
                // We let user choose to continue via button
            }
        } catch (error: any) {
            toast.error("Terjadi Kesalahan", {
                description: error.message || 'Gagal menyimpan penilaian ke server.',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleFeedbackSubmit = async () => {
        if (!systemRating || !hrRating) {
            toast.warning("Harap pilih rating untuk sistem dan HR.");
            return;
        }
        if (!assessorId && !assessorCode) {
            toast.error("Terjadi Kesalahan", { description: "Data penilai tidak ditemukan." });
            return;
        }

        setIsSubmittingFeedback(true);
        try {
            const response = await fetch('/api/submit-feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rating_sistem: systemRating,
                    rating_hr: hrRating,
                    message: feedbackMessage,
                    assessor_id: assessorId || assessorCode,
                    period_id: activePeriod?.id
                })
            });

            if (!response.ok) throw new Error("Gagal menyimpan feedback.");

            setHasSubmittedFeedback(true);
            toast.success("Feedback Terkirim!");
        } catch (error: any) {
            toast.error("Terjadi Kesalahan", { description: error.message });
        } finally {
            setIsSubmittingFeedback(false);
        }
    };

    const getAspectDescription = (key: string) => {
        // descriptions sudah di-filter berdasarkan target_role dan area_type saat fetch
        const found = descriptions.find(d => d.aspect_key === key);
        return found ? found.description_text : "Belum ada deskripsi untuk aspek ini.";
    };

    const allAspectsRated = aspects.length > 0 && Object.keys(scores).length === aspects.length;
    const isLastAspect = currentAspectIndex === aspects.length - 1;

    // ─── RENDER ───
    const renderContent = () => {
        if (isLoading && !assessed) return <div className="text-center p-10"><Loader2 className="mx-auto animate-spin" /></div>;
        if (error) return <div className="text-center p-10 text-red-500">{error}</div>;

        switch (step) {
            case 'welcome':
                return (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-4 py-4">
                        <p className="text-gray-600">Survei ini dibuat untuk perkembangan kita bersama!</p>
                        <Button onClick={() => setStep('selectAssessor')} className="w-full bg-[#033F3F] hover:bg-[#022020] text-white h-12 text-base">
                            Mulai!
                        </Button>
                    </motion.div>
                );

            case 'selectAssessor':
                return (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                        <div className="text-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <h3 className="font-semibold text-blue-800">
                                Pilih Nama Kamu
                            </h3>
                            <p className="text-sm text-blue-600">
                                Pastikan nama kamu ada di daftar kru outlet ini.
                            </p>
                        </div>
                        <div>
                            <label className="font-medium">Identitas Kamu *</label>
                            <Select onValueChange={handleSelectAssessor}>
                                <SelectTrigger className="w-full mt-2"><SelectValue placeholder="-- Pilih identitas kamu --" /></SelectTrigger>
                                <SelectContent>
                                    {allCrew.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button variant="link" onClick={() => setStep('welcome')} className="w-full">Kembali</Button>
                    </motion.div>
                );

            case 'selectAssessed':
                return (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                        <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
                            <h3 className="font-semibold text-green-800">Halo, {assessorName}!</h3>
                            <p className="text-sm text-green-600">Pilih rekan kerja yang ingin kamu nilai. Sisa yang belum dinilai: <strong>{remainingToAssess.length} orang</strong>.</p>
                        </div>
                        <div>
                            <label className="font-medium">Rekan Kerja *</label>
                            <Select onValueChange={handleSelectAssessed} value="">
                                <SelectTrigger className="w-full mt-2"><SelectValue placeholder="-- Pilih rekan kerja --" /></SelectTrigger>
                                <SelectContent>{remainingToAssess.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                    </motion.div>
                );

            case 'rating':
                if (aspects.length === 0) {
                    return <p className="text-center text-red-500 text-sm py-8">Tidak ada aspek yang dikonfigurasi untuk dinilai oleh Anda pada target ini.</p>;
                }

                const currentAspect = aspects[currentAspectIndex];
                const currentScore = scores[currentAspect?.aspect_key] || 0;

                return (
                    <div className="space-y-4">
                        {/* Progress */}
                        <WizardProgress current={currentAspectIndex} total={aspects.length} />

                        {/* Nama yang dinilai */}
                        <div className="text-center bg-slate-100 p-2 rounded-md">
                            <span className="text-sm text-gray-500">Menilai</span>
                            <h3 className="font-bold text-[#033F3F]">{assessed?.full_name}</h3>
                        </div>

                        {/* Carousel Aspect Card */}
                        <div className="relative overflow-hidden min-h-[360px]">
                            <AnimatePresence initial={false} custom={direction} mode="wait">
                                <motion.div
                                    key={currentAspectIndex}
                                    custom={direction}
                                    variants={slideVariants}
                                    initial="enter"
                                    animate="center"
                                    exit="exit"
                                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                    className="w-full"
                                >
                                    <div className="border rounded-2xl p-5 bg-white shadow-sm">
                                        {/* Aspect Title */}
                                        <div className="flex gap-2 mb-3 items-center">
                                            <BadgeCheck className="text-[#033F3F] flex-shrink-0" size={20} />
                                            <h4 className="font-bold text-[#033F3F] text-base leading-tight">
                                                {currentAspect.aspect_name}
                                            </h4>
                                        </div>

                                        {/* Description */}
                                        <div className="text-sm text-gray-600 mb-5 aspect-description-markdown max-h-32 overflow-y-auto">
                                            <ReactMarkdown>{getAspectDescription(currentAspect.aspect_key)}</ReactMarkdown>
                                        </div>

                                        {/* Rating Cards Grid */}
                                        <div className="grid grid-cols-5 gap-2">
                                            {[1, 2, 3, 4, 5].map(val => (
                                                <RatingCard
                                                    key={val}
                                                    value={val}
                                                    selected={currentScore === val}
                                                    onSelect={() => handleRatingChange(currentAspect.aspect_key, val)}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        {/* Navigation */}
                        <div className="flex items-center justify-between gap-2 pt-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => goToAspect(currentAspectIndex - 1)}
                                disabled={currentAspectIndex === 0}
                                className="gap-1"
                            >
                                <ChevronLeft size={16} /> Back
                            </Button>

                            {/* Dot Indicators */}
                            <div className="flex gap-1 flex-wrap justify-center max-w-[180px]">
                                {aspects.map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => goToAspect(i)}
                                        className={`w-2 h-2 rounded-full transition-all ${
                                            i === currentAspectIndex
                                                ? 'bg-[#033F3F] scale-125'
                                                : scores[aspects[i].aspect_key]
                                                    ? 'bg-emerald-400'
                                                    : 'bg-gray-300'
                                        }`}
                                    />
                                ))}
                            </div>

                            {isLastAspect ? (
                                <Button
                                    size="sm"
                                    onClick={handleSubmitAssessment}
                                    disabled={isSubmitting || !allAspectsRated}
                                    className="gap-1 bg-[#033F3F] hover:bg-[#022020]"
                                >
                                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Kirim'}
                                </Button>
                            ) : (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => goToAspect(currentAspectIndex + 1)}
                                    disabled={currentAspectIndex >= aspects.length - 1}
                                    className="gap-1"
                                >
                                    Next <ChevronRight size={16} />
                                </Button>
                            )}
                        </div>

                        <Button variant="ghost" onClick={backToSelectCrew} className="w-full text-sm text-gray-400 hover:text-gray-600">
                            Batal, pilih crew lain
                        </Button>
                    </div>
                );

            case 'success':
                const ratings = [
                    { emoji: '😠', label: 'Sangat Buruk' },
                    { emoji: '😞', label: 'Buruk' },
                    { emoji: '😐', label: 'Biasa Saja' },
                    { emoji: '😊', label: 'Baik' },
                    { emoji: '🤩', label: 'Sangat Baik' }
                ];

                let videoId = '';
                if (tiktokUrl) {
                    try {
                        const url = new URL(tiktokUrl);
                        const pathParts = url.pathname.split('/');
                        videoId = pathParts[pathParts.length - 1];
                    } catch (e) {}
                }

                return (
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-5 py-6">
                        {/* Success Animation */}
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                            className="mx-auto w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center"
                        >
                            <CheckCircle2 className="text-emerald-600" size={48} />
                        </motion.div>

                        <h2 className="text-xl font-bold text-[#033F3F]">
                            Penilaian untuk {assessed?.full_name} berhasil!
                        </h2>

                        {/* Quick Action: Continue */}
                        {remainingToAssess.length > 0 && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                                <Button
                                    onClick={backToSelectCrew}
                                    className="w-full bg-[#033F3F] hover:bg-[#022020] h-14 text-base gap-2"
                                >
                                    <ArrowRight size={18} />
                                    Lanjut Nilai Crew Lain ({remainingToAssess.length} sisa)
                                </Button>
                            </motion.div>
                        )}

                        {remainingToAssess.length === 0 && (
                            <>
                                <p className="text-gray-600 text-sm">
                                    Kamu sudah menyelesaikan semua penilaian di outlet {outletCode?.toUpperCase()} untuk {activePeriod?.name || 'periode ini'}.
                                </p>

                                {videoId && (
                                    <div className="mt-4 flex justify-center">
                                        <blockquote className="tiktok-embed" cite={tiktokUrl} data-video-id={videoId} style={{ maxWidth: '605px', minWidth: '325px' }}>
                                            <section></section>
                                        </blockquote>
                                    </div>
                                )}

                                <Separator className="my-6" />

                                <div className="space-y-6 text-left p-4 bg-slate-50 rounded-lg">
                                    {hasSubmittedFeedback ? (
                                        <div className="text-center py-8">
                                            <h3 className="text-lg font-semibold text-green-700">✔️ Feedback Terkirim!</h3>
                                            <p className="text-gray-600">Terima kasih atas masukanmu.</p>
                                        </div>
                                    ) : (
                                        <>
                                            <h3 className="text-lg font-semibold text-center text-gray-800">Kasih feedback dikit yuk!</h3>
                                            <div className="space-y-2">
                                                <label className="font-medium text-gray-700 text-sm">Gimana sistem Penilaian versi baru ini?</label>
                                                <div className="flex justify-center gap-x-3 sm:gap-x-5">
                                                    {ratings.map(({ emoji, label }) => (
                                                        <button key={label} onClick={() => setSystemRating(label)} className={`text-3xl transition-transform hover:scale-125 ${systemRating === label ? 'scale-125' : 'opacity-50'}`}>
                                                            {emoji}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="font-medium text-gray-700 text-sm">Gimana performa kerja tim HR Balista?</label>
                                                <div className="flex justify-center gap-x-3 sm:gap-x-5">
                                                    {ratings.map(({ emoji, label }) => (
                                                        <button key={label} onClick={() => setHrRating(label)} className={`text-3xl transition-transform hover:scale-125 ${hrRating === label ? 'scale-125' : 'opacity-50'}`}>
                                                            {emoji}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label htmlFor="feedbackMessage" className="font-medium text-gray-700 text-sm">Saran atau pesan buat HR (Opsional)</label>
                                                <Textarea id="feedbackMessage" value={feedbackMessage} onChange={(e) => setFeedbackMessage(e.target.value)} />
                                            </div>
                                            <div className="pt-4 text-center">
                                                <Button onClick={handleFeedbackSubmit} disabled={!systemRating || !hrRating || isSubmittingFeedback} className="w-full bg-[#033F3F]">
                                                    {isSubmittingFeedback ? <Loader2 className="animate-spin mr-2" size={16} /> : null} Kirim Feedback
                                                </Button>
                                            </div>
                                        </>
                                    )}
                                    <Separator className="my-4" />
                                    <div className="text-center">
                                        <a href="https://forms.gle/8bC2oNv1K42XA5916" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-white border px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50">
                                            <Mail size={16} /> Kotak Curhat (Klik Sini)
                                        </a>
                                    </div>
                                </div>
                            </>
                        )}
                    </motion.div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="flex justify-center items-start min-h-screen py-6 sm:py-10 bg-gray-100 px-4">
            <Card className="w-full max-w-md shadow-lg border-t-4 border-t-[#033F3F]">
                <CardHeader className="text-center space-y-2 pt-6">
                    <div className="flex justify-center mb-2">
                        <Image src="/logo.png" alt="Balista Logo" width={100} height={40} priority />
                    </div>
                    <CardTitle className="text-2xl font-bold text-[#022020]">
                       Penilaian Individu
                    </CardTitle>
                    <p className="font-medium text-[#033F3F]">{outlet?.name || outletCode?.toUpperCase()} • {activePeriod?.name || 'Periode Aktif'}</p>
                </CardHeader>
                <CardContent className="px-4 sm:px-6 pb-6">
                    {renderContent()}
                </CardContent>
            </Card>
        </div>
    );
}

declare global {
    interface Window {
        tiktok?: { load?: () => void };
    }
}
