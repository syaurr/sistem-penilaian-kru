'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { ASPECT_ORDER, ASPECT_FULL_NAMES, ASSESSOR_DISPLAY_NAMES } from '@/lib/constants';
import type { AssessorCode, AspectKey, AssessorAspectMapping } from '@/types';

const ASSESSOR_CODES: AssessorCode[] = ['crew', 'qc1', 'qc2', 'mse', 'oc', 'expa', 'dos'];

export default function MappingPage() {
    const [mappings, setMappings] = useState<AssessorAspectMapping[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/admin/mapping', { cache: 'no-store' });
            if (!res.ok) throw new Error('Gagal memuat data pemetaan.');
            const data = await res.json();
            setMappings(data);
        } catch (err: any) {
            toast.error('Error', { description: err.message });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleToggle = (aspectKey: AspectKey, assessorCode: AssessorCode, targetRole: string) => {
        setMappings(prev => prev.map(m => {
            if (m.aspect_key === aspectKey && m.assessor_code === assessorCode && m.target_role === targetRole) {
                return { ...m, is_enabled: !m.is_enabled };
            }
            return m;
        }));
    };

    const getMappingValue = (aspectKey: AspectKey, assessorCode: AssessorCode, targetRole: string): boolean => {
        const mapping = mappings.find(
            m => m.aspect_key === aspectKey && m.assessor_code === assessorCode && m.target_role === targetRole
        );
        return mapping?.is_enabled ?? false;
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await fetch('/api/admin/mapping', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(mappings.map(({ id, is_enabled }) => ({ id, is_enabled }))),
            });
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || 'Gagal menyimpan.');
            }
            toast.success('Sukses!', { description: 'Pemetaan asesor berhasil disimpan.' });
        } catch (err: any) {
            toast.error('Gagal Menyimpan', { description: err.message });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <p className="p-4">Memuat data pemetaan asesor...</p>;

    const renderTable = (targetRole: string) => (
        <div className="overflow-x-auto border rounded-md">
            <Table>
                <TableHeader className="bg-gray-50">
                    <TableRow>
                        <TableHead className="min-w-[250px] font-bold sticky left-0 bg-gray-50 z-10">Aspek Penilaian</TableHead>
                        {ASSESSOR_CODES.map(code => (
                            <TableHead key={code} className="text-center font-bold text-xs whitespace-nowrap">
                                {ASSESSOR_DISPLAY_NAMES[code]}
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {ASPECT_ORDER.map(aspectKey => (
                        <TableRow key={aspectKey} className="hover:bg-slate-50">
                            <TableCell className="font-medium sticky left-0 bg-white z-10">
                                {ASPECT_FULL_NAMES[aspectKey]}
                            </TableCell>
                            {ASSESSOR_CODES.map(code => (
                                <TableCell key={code} className="text-center">
                                    <Checkbox
                                        checked={getMappingValue(aspectKey, code, targetRole)}
                                        onCheckedChange={() => handleToggle(aspectKey, code, targetRole)}
                                    />
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Pemetaan Asesor</h1>
                    <p className="text-sm text-muted-foreground">
                        Kelola aspek mana yang bisa dinilai oleh setiap asesor. Centang = asesor bisa menilai aspek tersebut.
                    </p>
                </div>
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? 'Menyimpan...' : 'Simpan Semua Perubahan'}
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Matriks Pemetaan Asesor</CardTitle>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="leader">
                        <TabsList className="mb-4">
                            <TabsTrigger value="leader">Target: Leader</TabsTrigger>
                            <TabsTrigger value="crew">Target: Crew</TabsTrigger>
                        </TabsList>
                        <TabsContent value="leader">
                            {renderTable('leader')}
                        </TabsContent>
                        <TabsContent value="crew">
                            {renderTable('crew')}
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
