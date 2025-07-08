'use client';
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { toast } from "sonner";
import { id as dateFnsLocaleId } from 'date-fns/locale';
import Link from 'next/link';

type Period = { id: string; name: string; start_date: string; end_date: string; is_active: boolean };

const formSchema = z.object({
    name: z.string().min(3, "Nama periode dibutuhkan"),
    start_date: z.date({ required_error: "Tanggal mulai dibutuhkan." }),
    end_date: z.date({ required_error: "Tanggal selesai dibutuhkan." }),
});

export default function ManagePeriodsPage() {
    const [periods, setPeriods] = useState<Period[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    // State baru untuk mengontrol kalender secara manual
    const [showStartCalendar, setShowStartCalendar] = useState(false);
    const [showEndCalendar, setShowEndCalendar] = useState(false);
    const [isArchiving, setIsArchiving] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({ resolver: zodResolver(formSchema) });
    
    const fetchData = async () => {
        try {
            const res = await fetch('/api/admin/periods', { cache: 'no-store' });
            if (!res.ok) throw new Error("Gagal memuat data periode.");
            setPeriods(await res.json());
        } catch (error: any) {
            toast.error("Error", { description: error.message });
        }
    };

    useEffect(() => { fetchData() }, []);
    
    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        // ... (fungsi onSubmit sama seperti sebelumnya)
        try {
            const response = await fetch('/api/admin/periods', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            });
            if (!response.ok) throw new Error("Gagal menyimpan periode baru.");
            toast.success("Sukses", { description: "Periode baru berhasil dibuat." });
            setIsDialogOpen(false);
            form.reset();
            fetchData();
        } catch (error: any) {
            toast.error("Error", { description: error.message });
        }
    };

    const handleActivate = async (id: string) => {
        // ... (fungsi handleActivate sama seperti sebelumnya)
        try {
            const response = await fetch('/api/admin/periods', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id }),
            });
            if (!response.ok) throw new Error("Gagal mengaktifkan periode.");
            toast.success("Sukses", { description: "Periode berhasil diaktifkan." });
            fetchData();
        } catch (error: any) {
            toast.error("Error", { description: error.message });
        }
    };

    const handleArchive = async (id: string, name: string) => {
        setIsArchiving(true);
        try {
            const response = await fetch('/api/admin/archive-period', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ period_id: id }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "Gagal mengarsipkan periode.");
            }

            const result = await response.json();
            toast.success("Sukses!", { description: result.message });
            
            // --- PERUBAHAN UTAMA DI SINI ---
            // Alih-alih memanggil fetchData(), kita update state secara manual
            // untuk respons UI yang instan.
            setPeriods(currentPeriods => 
                currentPeriods.map(p => 
                    p.id === id ? { ...p, is_active: false } : p
                )
            );

        } catch (error: any) {
            toast.error("Error", { description: error.message });
        } finally {
            setIsArchiving(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Manajemen Periode Penilaian</h1>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={() => form.reset()}>Tambah Periode Baru</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader><DialogTitle>Buat Periode Baru</DialogTitle></DialogHeader>
                        <Form {...form}><form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                            <FormField name="name" control={form.control} render={({ field }) => (<FormItem><FormLabel>Nama Periode</FormLabel><FormControl><Input placeholder="Contoh: Agustus 2025" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                            
                            {/* === BAGIAN TANGGAL MULAI YANG DIUBAH TOTAL === */}
                            <FormField control={form.control} name="start_date" render={({ field }) => (<FormItem className="flex flex-col">
                                <FormLabel>Tanggal Mulai</FormLabel>
                                <Button
                                    type="button"
                                    variant={"outline"}
                                    className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}
                                    onClick={() => setShowStartCalendar((prev) => !prev)}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {field.value ? format(field.value, "PPP", { locale: dateFnsLocaleId }) : <span>Pilih tanggal</span>}
                                </Button>
                                {showStartCalendar && (
                                    <Calendar
                                        mode="single"
                                        selected={field.value}
                                        onSelect={(date) => {
                                            field.onChange(date);
                                            setShowStartCalendar(false);
                                        }}
                                        initialFocus
                                    />
                                )}
                                <FormMessage />
                            </FormItem>)}/>
                            
                            {/* === BAGIAN TANGGAL SELESAI YANG DIUBAH TOTAL === */}
                            <FormField control={form.control} name="end_date" render={({ field }) => (<FormItem className="flex flex-col">
                                <FormLabel>Tanggal Selesai</FormLabel>
                                 <Button
                                    type="button"
                                    variant={"outline"}
                                    className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}
                                    onClick={() => setShowEndCalendar((prev) => !prev)}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {field.value ? format(field.value, "PPP", { locale: dateFnsLocaleId }) : <span>Pilih tanggal</span>}
                                </Button>
                                {showEndCalendar && (
                                    <Calendar
                                        mode="single"
                                        selected={field.value}
                                        onSelect={(date) => {
                                            field.onChange(date);
                                            setShowEndCalendar(false);
                                        }}
                                        initialFocus
                                    />
                                )}
                                <FormMessage />
                            </FormItem>)}/>

                            <Button type="submit" className="w-full">Simpan Periode</Button>
                        </form></Form>
                    </DialogContent>
                </Dialog>
            </div>
            {/* Tabel tidak berubah */}
            <Table>
                <TableHeader><TableRow><TableHead>Nama</TableHead><TableHead>Mulai</TableHead><TableHead>Selesai</TableHead><TableHead>Status</TableHead><TableHead>Aksi</TableHead></TableRow></TableHeader>
                <TableBody>{periods.map(p => (
                    <TableRow key={p.id}>
                        <TableCell>{p.name}</TableCell>
                        <TableCell>{format(new Date(p.start_date), "dd MMM yyyy", { locale: dateFnsLocaleId })}</TableCell>
                        <TableCell>{format(new Date(p.end_date), "dd MMM yyyy", { locale: dateFnsLocaleId })}</TableCell>
                        <TableCell>{p.is_active ? <span className="px-2 py-1 bg-green-200 text-green-800 rounded-full text-xs">Aktif</span> : 'Non-aktif'}</TableCell>
                        <TableCell><Button size="sm" onClick={() => handleActivate(p.id)} disabled={p.is_active}>Jadikan Aktif</Button>
                        {p.is_active && (
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive" size="sm" disabled={isArchiving}>
                                            {isArchiving ? 'Memproses...' : 'Tutup & Arsipkan'}
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Anda Yakin Ingin Menutup Periode "{p.name}"?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Aksi ini akan menyimpan peringkat final Top 25 secara permanen dan menonaktifkan periode ini. Aksi ini tidak bisa dibatalkan.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Batal</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleArchive(p.id, p.name)}>
                                                Ya, Tutup & Arsipkan
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            )}
                            <Link href={`/admin/recap/${p.id}`}>
                                <Button variant="secondary" size="sm">Lihat Rekap</Button>
                            </Link>
                        </TableCell>
                    </TableRow>
                ))}</TableBody>
            </Table>
        </div>
    );
}