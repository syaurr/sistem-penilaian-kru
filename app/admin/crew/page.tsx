'use client';

import { useEffect, useState, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import Papa from 'papaparse';

// Tipe data untuk kru dan outlet
type Outlet = { id: string; name: string; };
type Crew = { id: string; full_name: string; role: string; gender: string; is_active: boolean; outlets: Outlet | null; };

// Skema validasi form dengan Zod
const formSchema = z.object({
    full_name: z.string().min(3, { message: "Nama lengkap minimal 3 karakter." }),
    outlet_id: z.string({ required_error: "Harap pilih outlet."}),
    role: z.enum(["crew", "leader", "supervisor"], { required_error: "Harap pilih role." }),
    gender: z.enum(["male", "female"], { required_error: "Harap pilih gender." }),
    is_active: z.boolean(),
});

const CrewImporter = ({ outlets, onImportSuccess }: { outlets: Outlet[], onImportSuccess: () => void }) => {
    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                const outletMap = new Map(outlets.map(o => [o.name.toLowerCase().trim(), o.id]));
                
                // --- PERUBAHAN LOGIKA DI SINI ---
                const dataToImport = results.data
                    .map((row: any) => {
                        // Ambil gender dari CSV dan ubah ke lowercase
                        const genderFromCsv = String(row.gender || '').toLowerCase().trim();
                        // "Terjemahkan" ke format database
                        const mappedGender = genderFromCsv === 'laki-laki' ? 'male' : genderFromCsv === 'perempuan' ? 'female' : null;

                        return {
                            full_name: row.nama,
                            outlet_id: outletMap.get(String(row.outlet || '').toLowerCase().trim()),
                            role: String(row.role || '').toLowerCase().trim(),
                            gender: mappedGender, // Gunakan gender yang sudah diterjemahkan
                            is_active: true
                        };
                    })
                    .filter(item => item.full_name && item.outlet_id && item.role && item.gender);

                console.log("Data yang akan diimpor (setelah diterjemahkan):", dataToImport);

                if (dataToImport.length === 0) {
                    toast.error("Import Gagal", { description: "Tidak ada data valid. Pastikan nama header dan isi (outlet, role, gender) sudah benar." });
                    return;
                }

                try {
                    const response = await fetch('/api/admin/crew/bulk-import', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(dataToImport)
                    });
                    const result = await response.json();
                    if (!response.ok) throw new Error(result.message);
                    toast.success("Import Berhasil", { description: result.message });
                    onImportSuccess();
                } catch (error: any) {
                    toast.error("Import Gagal", { description: error.message });
                }
            }
        });
        event.target.value = ''; 
    };

    return (
        <div>
            <Button asChild variant="outline">
                <label htmlFor="csv-importer" className="cursor-pointer">Import dari Sheet (CSV)</label>
            </Button>
            <input type="file" id="csv-importer" accept=".csv" className="hidden" onChange={handleFileChange} />
             <p className="text-xs text-gray-500 mt-1">Header: `nama`, `outlet`, `role`, `gender`</p>
        </div>
    );
};


export default function ManageCrewPage() {
    const [crewList, setCrewList] = useState<Crew[]>([]);
    const [outlets, setOutlets] = useState<Outlet[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingCrew, setEditingCrew] = useState<Crew | null>(null);
    const [showInactive, setShowInactive] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            full_name: "",
            outlet_id: "",
            role: undefined,
            gender: undefined,
            is_active: true,
        },
    });

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [crewRes, outletsRes] = await Promise.all([
                fetch('/api/admin/crew', { cache: 'no-store' }), 
                fetch('/api/outlets', { cache: 'no-store' })
            ]);
            if (!crewRes.ok || !outletsRes.ok) throw new Error("Gagal memuat data dari server.");
            
            const crewData = await crewRes.json();
            const outletsData = await outletsRes.json();
            setCrewList(crewData);
            setOutlets(outletsData);
        } catch (error: any) {
            toast.error("Gagal Memuat Data", { description: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleOpenDialog = (crew: Crew | null = null) => {
        setEditingCrew(crew);
        form.reset(
            crew
                ? {
                    full_name: crew.full_name,
                    outlet_id: crew.outlets?.id ?? "",
                    role: crew.role as "crew" | "leader" | "supervisor",
                    gender: crew.gender as "male" | "female",
                    is_active: crew.is_active,
                }
                : { full_name: '', outlet_id: '', role: undefined, gender: undefined, is_active: true }
        );
        setIsDialogOpen(true);
    };

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            const method = editingCrew ? 'PATCH' : 'POST';
            const body = editingCrew ? JSON.stringify({ id: editingCrew.id, ...values }) : JSON.stringify(values);

            const response = await fetch('/api/admin/crew', { method, headers: { 'Content-Type': 'application/json' }, body });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Gagal menyimpan data kru.');
            }
            toast.success("Sukses!", { description: `Data kru berhasil ${editingCrew ? 'diperbarui' : 'dibuat'}.` });
            setIsDialogOpen(false);
            fetchData();
        } catch (error: any) {
            toast.error("Error!", { description: error.message });
        }
    };

    const handleDelete = async (id: string) => {
        try {
            const response = await fetch('/api/admin/crew', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id }),
            });
            if (!response.ok) throw new Error("Gagal menghapus data kru.");
            toast.success("Sukses!", { description: "Data kru berhasil dihapus permanen." });
            fetchData();
        } catch (error: any) {
            toast.error("Error!", { description: error.message });
        }
    };

    const handleToggleActive = async (id: string, currentStatus: boolean) => {
        try {
            const response = await fetch('/api/admin/crew', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, is_active: !currentStatus }),
            });
            if (!response.ok) throw new Error("Gagal mengubah status kru.");
            toast.success("Sukses!", { description: `Status kru berhasil diubah.` });
            fetchData();
        } catch (error: any) {
            toast.error("Error!", { description: error.message });
        }
    };
    
    const filteredCrew = crewList.filter(crew => crew.is_active || showInactive);

    if(isLoading) return <div className="text-center p-10">Memuat data kru...</div>;

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <h1 className="text-2xl font-bold">Manajemen Kru</h1>
                <div className="flex items-center space-x-2">
                    <Checkbox id="show-inactive" checked={showInactive} onCheckedChange={(checked) => setShowInactive(checked as boolean)} />
                    <Label htmlFor="show-inactive" className="text-sm font-medium">Tampilkan kru non-aktif</Label>
                </div>
                <div className="flex items-center gap-2">
                    <CrewImporter outlets={outlets} onImportSuccess={fetchData} />
                    <Button onClick={() => handleOpenDialog()}>Tambah Kru Baru</Button>
                </div>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>{editingCrew ? 'Edit Kru' : 'Tambah Kru Baru'}</DialogTitle></DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                           <FormField control={form.control} name="full_name" render={({ field }) => ( <FormItem><FormLabel>Nama Lengkap</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                           <FormField control={form.control} name="outlet_id" render={({ field }) => ( <FormItem><FormLabel>Outlet</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Pilih outlet" /></SelectTrigger></FormControl><SelectContent>{outlets.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )}/>
                            <div className="grid grid-cols-2 gap-4">
                                <FormField control={form.control} name="role" render={({ field }) => ( <FormItem><FormLabel>Role</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Pilih role" /></SelectTrigger></FormControl><SelectContent><SelectItem value="crew">Crew</SelectItem><SelectItem value="leader">Leader</SelectItem><SelectItem value="supervisor">Supervisor</SelectItem></SelectContent></Select><FormMessage /></FormItem> )}/>
                                <FormField control={form.control} name="gender" render={({ field }) => ( <FormItem><FormLabel>Gender</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Pilih gender" /></SelectTrigger></FormControl><SelectContent><SelectItem value="male">Laki-laki</SelectItem><SelectItem value="female">Perempuan</SelectItem></SelectContent></Select><FormMessage /></FormItem> )}/>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="secondary" onClick={() => setIsDialogOpen(false)}>Batal</Button>
                                <Button type="submit">Simpan</Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            <div className="w-full overflow-x-auto rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nama Lengkap</TableHead>
                            <TableHead>Outlet</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredCrew.map(crew => (
                            <TableRow key={crew.id} className={!crew.is_active ? 'bg-gray-100' : ''}>
                                <TableCell className="font-medium">{crew.full_name}</TableCell>
                                <TableCell>{crew.outlets?.name || 'N/A'}</TableCell>
                                <TableCell className="capitalize">{crew.role}</TableCell>
                                <TableCell>
                                    {crew.is_active 
                                        ? <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">Aktif</span> 
                                        : <span className="px-2 py-1 bg-gray-200 text-gray-700 rounded-full text-xs font-medium">Non-aktif</span>}
                                </TableCell>
                                <TableCell className="space-x-2 whitespace-nowrap text-right">
                                    <Button variant="outline" size="sm" onClick={() => handleOpenDialog(crew)}>Edit</Button>
                                    <Button variant={crew.is_active ? "secondary" : "default"} size="sm" onClick={() => handleToggleActive(crew.id, crew.is_active)}>{crew.is_active ? 'Nonaktifkan' : 'Aktifkan'}</Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild><Button variant="destructive" size="sm">Hapus</Button></AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader><AlertDialogTitle>Anda Yakin?</AlertDialogTitle><AlertDialogDescription>Aksi ini akan menghapus data kru secara permanen.</AlertDialogDescription></AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDelete(crew.id)} className="bg-red-600 hover:bg-red-700">Ya, Hapus Permanen</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}