'use client';

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

type Outlet = { id: string; name: string; outlet_code: string; };

const formSchema = z.object({
    name: z.string().min(3, { message: "Nama outlet minimal 3 karakter" }),
    outlet_code: z.string().min(2, { message: "Kode outlet minimal 2 karakter" }).max(10).transform(val => val.toUpperCase()),
});

export default function ManageOutletsPage() {
    const [outlets, setOutlets] = useState<Outlet[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingOutlet, setEditingOutlet] = useState<Outlet | null>(null);

    const form = useForm<z.infer<typeof formSchema>>({ resolver: zodResolver(formSchema) });

    const fetchData = async () => {
        setIsLoading(true);
        // PERUBAHAN 1: Tambahkan { cache: 'no-store' } untuk memastikan data selalu baru
        const res = await fetch('/api/admin/outlets', { cache: 'no-store' });
        const data = await res.json();
        setOutlets(data);
        setIsLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleOpenDialog = (outlet: Outlet | null = null) => {
        setEditingOutlet(outlet);
        form.reset(outlet || { name: '', outlet_code: '' });
        setIsDialogOpen(true);
    };

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            const method = editingOutlet ? 'PATCH' : 'POST';
            const body = editingOutlet ? JSON.stringify({ id: editingOutlet.id, ...values }) : JSON.stringify(values);

            const response = await fetch('/api/admin/outlets', { method, headers: { 'Content-Type': 'application/json' }, body });
            if (!response.ok) throw new Error("Gagal menyimpan data outlet.");

            toast.success("Sukses!", {
                description: "Data outlet berhasil disimpan.",
            });
            
            setIsDialogOpen(false);
            fetchData();
        } catch (error: any) {
            // 3. UBAH CARA PEMANGGILAN TOAST ERROR
            toast.error("Error!", {
                description: error.message,
            });
        }
    };

    const handleDelete = async (id: string) => {
        try {
            const response = await fetch('/api/admin/outlets', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id }),
            });

            if (!response.ok) throw new Error("Gagal menghapus data outlet.");
            
            // 3. UBAH CARA PEMANGGILAN TOAST
            toast.success("Sukses!", {
                description: "Data outlet berhasil dihapus.",
            });
            fetchData();
        } catch (error: any) {
             // 3. UBAH CARA PEMANGGILAN TOAST ERROR
            toast.error("Error!", {
                description: error.message,
            });
        }
    };

    if(isLoading) return <p>Loading data outlet...</p>;

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Manajemen Outlet</h1>
                <Button onClick={() => handleOpenDialog()}>Tambah Outlet Baru</Button>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>{editingOutlet ? 'Edit Outlet' : 'Tambah Outlet Baru'}</DialogTitle></DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                           <FormField control={form.control} name="name" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nama Outlet</FormLabel>
                                    <FormControl><Input placeholder="Contoh: Dago Atas" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            <FormField control={form.control} name="outlet_code" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Kode Outlet</FormLabel>
                                    <FormControl><Input placeholder="Contoh: DAGO" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            <DialogFooter>
                                <DialogClose asChild><Button type="button" variant="secondary">Batal</Button></DialogClose>
                                <Button type="submit">Simpan</Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Nama Outlet</TableHead>
                        <TableHead>Kode</TableHead>
                        <TableHead>Aksi</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {outlets.map(outlet => (
                        <TableRow key={outlet.id}>
                            <TableCell className="font-medium">{outlet.name}</TableCell>
                            <TableCell>{outlet.outlet_code}</TableCell>
                            <TableCell className="space-x-2">
                                <Button variant="outline" size="sm" onClick={() => handleOpenDialog(outlet)}>Edit</Button>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild><Button variant="destructive" size="sm">Hapus</Button></AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Anda Yakin?</AlertDialogTitle>
                                            <AlertDialogDescription>Aksi ini akan menghapus outlet dan semua data kru yang terhubung dengannya secara permanen.</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Batal</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDelete(outlet.id)} className="bg-red-600 hover:bg-red-700">Ya, Hapus</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}