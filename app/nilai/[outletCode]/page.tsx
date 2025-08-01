'use client';

// Import hooks dan komponen yang kita butuhkan
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Star } from 'lucide-react';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient'; // Pastikan import ini ada
import { toast } from "sonner";

// Definisikan tipe data untuk TypeScript
type CrewMember = {
    id: string;
    full_name: string;
    role: 'crew' | 'leader' | 'supervisor';
    gender: 'male' | 'female';
};

type Aspect = {
    aspect_key: string;
    aspect_name: string;
};

type Step = 'welcome' | 'description' | 'selectAssessor' | 'selectAssessed' | 'rating' | 'success';

// Komponen utama halaman kita
export default function AssessmentPage({ params }: { params: { outletCode: string } }) {
    // === STATE MANAGEMENT ===
    const [step, setStep] = useState<Step>('welcome');
    const [allCrew, setAllCrew] = useState<CrewMember[]>([]);
    const [assessor, setAssessor] = useState<CrewMember | null>(null);
    const [assessed, setAssessed] = useState<CrewMember | null>(null);
    const [remainingToAssess, setRemainingToAssess] = useState<CrewMember[]>([]);
    const [aspects, setAspects] = useState<Aspect[]>([]);
    const [scores, setScores] = useState<Record<string, number>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState('');

    const { outletCode } = params;

    // === DATA FETCHING ===
    useEffect(() => {
        if (!outletCode) return;
        const fetchCrewData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await fetch(`/api/crew/${outletCode}`);
                if (!response.ok) throw new Error('Gagal memuat data kru.');
                const data: CrewMember[] = await response.json();
                const nonSupervisorCrew = data.filter(c => c.role !== 'supervisor');
                setAllCrew(nonSupervisorCrew);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };
        fetchCrewData();
    }, [outletCode]);

    useEffect(() => {
    // Fungsi ini hanya berjalan jika kita berada di halaman 'success'
        if (step === 'success') {
            const script = document.createElement('script');
            script.src = 'https://www.tiktok.com/embed.js';
            script.async = true;
            document.body.appendChild(script);

            // Cleanup function untuk menghapus script saat komponen unmount
            return () => {
                document.body.removeChild(script);
            };
        }
    }, [step]); // Bergantung pada state 'step'

    // === HANDLER FUNCTIONS ===
    const handleStart = () => setStep('description');
    const handleStartAssessment = () => setStep('selectAssessor');

    const handleSelectAssessor = async (assessorId: string) => {
    const selected = allCrew.find(crew => crew.id === assessorId);
    if (selected) {
        setAssessor(selected);
        setIsLoading(true); // Tampilkan loading saat kita cek riwayat

        try {
            // Panggil API baru untuk mendapatkan ID kru yang sudah dinilai
            const historyResponse = await fetch(`/api/history?assessor_id=${assessorId}`);
            const assessedIds: string[] = await historyResponse.json();

            // Filter daftar kru: tampilkan hanya yang ID-nya TIDAK ADA di dalam assessedIds
            // dan juga bukan diri sendiri
            const unassessedCrew = allCrew.filter(
                crew => crew.id !== assessorId && !assessedIds.includes(crew.id)
            );

            setRemainingToAssess(unassessedCrew);

            // Jika ternyata semua sudah dinilai, langsung ke halaman sukses
            if (unassessedCrew.length === 0) {
                setStep('success');
            } else {
                setStep('selectAssessed');
            }
            } catch (err) {
                setError("Gagal memuat riwayat penilaian.");
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleSelectAssessed = async (assessedId: string) => {
        if (!assessedId) return;
        const selected = remainingToAssess.find(crew => crew.id === assessedId);
        if (selected) {
            setAssessed(selected);
            setIsLoading(true);
            try {
                const response = await fetch(`/api/assessment-aspects?role=${selected.role}&gender=${selected.gender}`);
                const aspectsData = await response.json();
                if (!response.ok) throw new Error("Gagal mengambil data aspek");
                setAspects(aspectsData);
                setStep('rating');
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleRatingChange = (aspect_key: string, value: number) => {
        setScores(prev => ({ ...prev, [aspect_key]: value }));
    };
    
    const backToSelectCrew = () => {
        setAssessed(null);
        setScores({});
        setAspects([]);
        setStep('selectAssessed');
    }

    const handleSubmitAssessment = async () => {
        // 1. Ganti 'alert' dengan 'toast.warning' untuk validasi
        if (!assessor || !assessed || Object.keys(scores).length !== aspects.length) {
            toast.warning("Form Belum Lengkap", {
                description: "Harap isi semua penilaian bintang sebelum mengirim.",
            });
            return;
        }

        setIsSubmitting(true);

        try {
            const periodResponse = await fetch('/api/active-period');
            if (!periodResponse.ok) {
                const errorData = await periodResponse.json();
                throw new Error(errorData.message || "Tidak bisa menemukan periode aktif.");
            }
            const activePeriod: { id: string } = await periodResponse.json();

            const { error: insertError } = await supabase
                .from('assessments')
                .insert({
                    period_id: activePeriod.id,
                    assessor_id: assessor.id,
                    assessed_id: assessed.id,
                    scores,
                });

            if (insertError) throw insertError;

            // 2. Ganti 'setMessage' dengan 'toast.success'
            toast.success("Penilaian Berhasil!", {
                description: `Penilaian untuk ${assessed.full_name} telah berhasil disimpan.`,
            });
            
            const updatedRemaining = remainingToAssess.filter(crew => crew.id !== assessed.id);
            setRemainingToAssess(updatedRemaining);
            
            if (updatedRemaining.length === 0) {
                setStep('success');
            } else {
                backToSelectCrew();
            }

        } catch (error: any) {
            // 3. Ganti 'setError' dengan 'toast.error'
            toast.error("Terjadi Kesalahan", {
                description: error.message || 'Gagal menyimpan penilaian ke server.',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // === RENDER LOGIC ===
    const renderContent = () => {
        if (isLoading && !assessed) return <div className="text-center p-10">Loading...</div>;
        if (error) return <div className="text-center p-10 text-red-500">{error}</div>;

        switch (step) {
            case 'welcome':
                return (
                    <div className="text-center space-y-4 py-4">
                        <p className="text-gray-600">Survei ini dibuat untuk perkembangan kita bersama!</p>
                        <Button onClick={handleStart} className="w-full bg-[#033F3F] hover:bg-[#022020] text-white">
                            Mulai!
                        </Button>
                    </div>
                );
            
            case 'description':
                return (
                    <div className="space-y-4 text-left max-h-[60vh] overflow-y-auto p-1 pr-4">
                        <h3 className="text-center text-lg font-bold text-[#022020]">aa teteh, geulis kasep, crew balistaa di baca dulu yaaah 🫰🏻</h3>
                        <Separator />
                        
                        <div className="space-y-2">
                            <h4 className="font-semibold text-base text-[#033F3F]">🧑‍🏫 Aspek Kepemimpinan dan Manajerial itu apa?</h4>
                            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 pl-2">
                                <li>Jadi penengah kalau ada masalah antar crew</li>
                                <li>Ngingetin & negur kalau ada yang salah</li>
                                <li>Bangun kerja sama tim biar makin solid</li>
                                <li>Nyampein info dari manajemen ke tim</li>
                                <li>Atur jadwal piket kebersihan biar adil dan jalan terus</li>
                                <li>Bikin tim semangat kerja, kasih motivasi juga</li>
                                <li>Bantu crew berkembang, kasih arahan biar makin jago</li>
                                <li>Ciptain suasana kerja yang nyaman</li>
                                <li>Kasih contoh langsung, bukan cuma nyuruh-nyuruh</li>
                            </ul>
                        </div>
                        <Separator />

                        <div className="space-y-2">
                            <h4 className="font-semibold text-base text-[#033F3F]">🧰 Aspek Persiapan itu apa?</h4>
                             <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 pl-2">
                                 <li>Prepare yang ada di Bagian Freezer kaya bahan yang frozen dll.</li>
                                 <li>Prepare Bagian Dapur kaya alat alat, adonan, dll.</li>
                             </ul>
                        </div>
                        <Separator />

                        <div className="space-y-2">
                            <h4 className="font-semibold text-base text-[#033F3F]">🛎️ Aspek Penerimaan Pesanan itu apa?</h4>
                            <div className="pl-2 space-y-2">
                                <p className="font-semibold text-sm">👦 Untuk Crew Cowok (Aplikasi Online)</p>
                                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 pl-2">
                                    <li>Cek & ambil pesanan dari aplikasi</li>
                                    <li>Pastikan pesanan cepet disiapin</li>
                                    <li>Biar driver nggak nunggu lama dan nggak komplain</li>
                                </ul>
                                <p className="font-semibold text-sm pt-2">👧 Untuk Crew Cewek (Greet & Great)</p>
                                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 pl-2">
                                    <li>Sambut pelanggan dengan senyum</li>
                                    <li>Bikin kesan pertama yang hangat & ramah</li>
                                    <li>Catat pesanan dari pelanggan langsung (Orderan Offline)</li>
                                    <li>Pastikan pesanan nggak salah input</li>
                                    <li>Layani dengan cepat, jelas, dan ramah</li>
                                </ul>
                                <p className="font-semibold text-sm pt-2">✅ Untuk Semua Crew (Bagian Tambahan)</p>
                                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 pl-2">
                                    <li>Ikut bantu dapur pas ramai</li>
                                    <li>Urus admin: absensi, slip gaji, belanja, dll</li>
                                    <li>Pokoknya yang penting bantu tim, bukan ngilang</li>
                                </ul>
                            </div>
                        </div>
                        <Separator />

                        <div className="space-y-2">
                             <h4 className="font-semibold text-base text-[#033F3F]">🍣 Aspek Pembuatan Order itu apa?</h4>
                            <div className="pl-2 space-y-2">
                                <p className="font-semibold text-sm">👦 Untuk Crew Cowok (Pembuatan Sushi & Hasil Orderan)</p>
                                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 pl-2">
                                    <li>Seberapa jago dia bikin sushi? Rapi nggak? Sesuai SOP?</li>
                                    <li>Hasil akhirnya gimana? Cakep nggak tampilannya? Pas rasanya? Konsumen puas nggak?</li>
                                </ul>
                                <p className="font-semibold text-sm pt-2">👧 Untuk Crew Cewek (Penjelasan & Penawaran)</p>
                                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 pl-2">
                                    <li>Bisa jelasin menu ke konsumen nggak? Paham isinya?</li>
                                    <li>Rajin nggak kasih info promo? Bikin konsumen tertarik atau malah bingung?</li>
                                </ul>
                            </div>
                        </div>
                        <Separator />

                         <div className="space-y-2">
                            <h4 className="font-semibold text-base text-[#033F3F]">📦 Aspek Pengemasan Pesanan itu apa?</h4>
                            <div className="pl-2 space-y-2">
                                <p className="font-semibold text-sm">✅ Untuk Semua Crew (Packing-nya gimana?)</p>
                                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 pl-2">
                                    <li>Apakah lengkap? Rapi? Ada yang suka ketinggalan nggak?</li>
                                    <li>Penting banget supaya pesanan sampai ke pelanggan dalam kondisi oke!</li>
                                </ul>
                            </div>
                        </div>
                        <Separator />

                        <div className="space-y-2">
                            <h4 className="font-semibold text-base text-[#033F3F]">📊 Aspek Stock Opname itu apa?</h4>
                             <div className="pl-2 space-y-2">
                                <p className="font-semibold text-sm">✅ Untuk Semua Crew (Gimana cara dia ngecek & hitung stok?)</p>
                                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 pl-2">
                                    <li>Teliti nggak? Ada yang sering kelewat atau salah hitung nggak?</li>
                                    <li>Soalnya stok yang rapi = kerja lebih lancar dan outlet nggak kehabisan bahan!</li>
                                </ul>
                            </div>
                        </div>
                        <Separator />

                        <div className="space-y-2">
                            <h4 className="font-semibold text-base text-[#033F3F]">🧼 Aspek Kebersihan itu apa?</h4>
                             <div className="pl-2 space-y-2">
                                <p className="font-semibold text-sm">👕 Kebersihan Diri (Semua Crew)</p>
                                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 pl-2">
                                    <li>Penampilan crew itu cerminan outlet.</li>
                                    <li>Seragam lengkap? Rambut rapi? Atau malah asal-asalan?</li>
                                </ul>
                                <p className="font-semibold text-sm pt-2">🧽 Kebersihan Area Konsumen (Crew Cewe)</p>
                                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 pl-2">
                                    <li>Area depan harus selalu bersih & nyaman buat pelanggan.</li>
                                    <li>Lantai, meja, kaca — semuanya harus diperhatikan!</li>
                                </ul>
                                 <p className="font-semibold text-sm pt-2">🧼 Kebersihan Area Belakang/Dapur (Crew Cowok)</p>
                                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 pl-2">
                                    <li>Gimana dia jaga kebersihan dapur?</li>
                                    <li>Termasuk bersihin kulkas, alat masak, tempat cuci piring, jerigen, dan bahan-bahan lainnya.</li>
                                </ul>
                            </div>
                        </div>
                        <Button onClick={handleStartAssessment} className="w-full mt-6 bg-[#033F3F] hover:bg-[#022020] text-white">
                            Saya Mengerti, Lanjutkan Penilaian
                        </Button>
                    </div>
                );

            case 'selectAssessor':
                return (
                    <div className="space-y-6">
                        <div className="text-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <h3 className="font-semibold text-blue-800">Pilih Nama Kamu Dulu ya</h3>
                            <p className="text-sm text-blue-600">Ini hanya syarat agar kamu tidak menilai diri sendiri.</p>
                        </div>
                        <Separator />
                        <div>
                            <label className="font-medium">Nama Kamu *</label>
                            <Select onValueChange={handleSelectAssessor}>
                                <SelectTrigger className="w-full mt-2"><SelectValue placeholder="-- Pilih nama kamu --" /></SelectTrigger>
                                <SelectContent>{allCrew.map((crew) => (<SelectItem key={crew.id} value={crew.id}>{crew.full_name}</SelectItem>))}</SelectContent>
                            </Select>
                        </div>
                    </div>
                );
            case 'selectAssessed':
                 return (
                    <div className="space-y-6">
                        <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
                            <h3 className="font-semibold text-green-800">Pilih Rekan Kerja</h3>
                            <p className="text-sm text-green-600">Sisa rekan kerja yang belum dinilai: <strong>{remainingToAssess.length} orang</strong>.</p>
                        </div>
                        <Separator />
                        <div>
                            <label className="font-medium">Rekan Kerja *</label>
                            <Select onValueChange={handleSelectAssessed} value="">
                                <SelectTrigger className="w-full mt-2"><SelectValue placeholder="-- Pilih rekan kerja --" /></SelectTrigger>
                                <SelectContent>{remainingToAssess.map((crew) => (<SelectItem key={crew.id} value={crew.id}>{crew.full_name}</SelectItem>))}</SelectContent>
                            </Select>
                        </div>
                    </div>
                );
            case 'rating':
                if (isLoading) return <div className="text-center p-10">Memuat aspek penilaian...</div>;
                return (
                    <div className="space-y-6">
                        <div className="text-center">
                            <h3 className="text-lg font-semibold">Anda Menilai: {assessed?.full_name}</h3>
                            <p className="text-sm text-gray-500">Berikan penilaian dari 1 sampai 5 bintang.</p>
                        </div>
                        <Separator />
                        <div className="space-y-4 max-h-60 overflow-y-auto pr-2">{aspects.map(aspect => (
                            <div key={aspect.aspect_key}>
                                <label className="font-medium text-gray-800">{aspect.aspect_name}</label>
                                <div className="mt-2"><StarRating aspect_key={aspect.aspect_key} /></div>
                            </div>
                        ))}</div>
                        <Button onClick={handleSubmitAssessment} disabled={isSubmitting} className="w-full bg-green-600 hover:bg-green-700">
                            {isSubmitting ? 'Menyimpan...' : 'Kirim Penilaian'}
                        </Button>
                        <Button variant="link" onClick={backToSelectCrew} className="w-full">Batal</Button>
                    </div>
                );
            case 'success':
                 return (
                    <div className="text-center space-y-4 py-8">
                         <h2 className="text-2xl font-bold text-green-600">Luar Biasa, Terima Kasih!</h2>
                         <p className="text-gray-600">
                            Anda sudah berhasil menilai semua rekan kerja di outlet Anda untuk periode ini. Kontribusi Anda sangat berarti!
                         </p>
                         <div className="mt-6">
                             <blockquote className="tiktok-embed" cite="https://www.tiktok.com/@zachking/video/7229891992745938219" data-video-id="7229891992745938219" style={{ maxWidth: '605px', minWidth: '325px' }} >
                                 <section></section>
                             </blockquote>
                         </div>
                    </div>
                );
            default:
                return null;
        }
    };

    // StarRating component for rating stars
    function StarRating({ aspect_key }: { aspect_key: string }) {
        const value = scores[aspect_key] || 0;
        const handleClick = (rating: number) => {
            handleRatingChange(aspect_key, rating);
        };
        return (
            <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        type="button"
                        onClick={() => handleClick(star)}
                        className="focus:outline-none"
                        aria-label={`Beri nilai ${star} bintang`}
                    >
                        <Star
                            size={28}
                            className={star <= value ? "fill-yellow-400 stroke-yellow-500" : "stroke-gray-300"}
                            fill={star <= value ? "#facc15" : "none"}
                        />
                    </button>
                ))}
            </div>
        );
    }

    return (
        <div className="flex justify-center items-start min-h-screen py-10 bg-gray-100">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader className="text-center space-y-4 pt-6">
                    <div className="flex justify-center">
                        <Image src="/logo.png" alt="Balista Logo" width={100} height={40} priority />
                    </div>
                    <CardTitle className="text-2xl font-bold text-[#022020]">
                       Penilaian Individu - Outlet {outletCode.toUpperCase()}
                    </CardTitle>
                </CardHeader>
                <CardContent className="px-6 pb-6">
                    {message && <div className="mb-4 text-center p-2 bg-green-100 text-green-700 rounded-md">{message}</div>}
                    {renderContent()}
                </CardContent>
            </Card>
        </div>
    );
}