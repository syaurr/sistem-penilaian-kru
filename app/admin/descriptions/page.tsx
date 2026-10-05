'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ASPECT_ORDER, ASPECT_FULL_NAMES, ASPECT_EMOJIS, AREA_TYPE_DISPLAY_NAMES } from '@/lib/constants';
import type { AspectKey, AspectDescription } from '@/types';

export default function DescriptionsPage() {
    const [descriptions, setDescriptions] = useState<AspectDescription[]>([]);
    const [selectedAspect, setSelectedAspect] = useState<AspectKey>(ASPECT_ORDER[0]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/aspect-descriptions', { cache: 'no-store' });
            if (!res.ok) throw new Error('Gagal memuat data deskripsi.');
            const data = await res.json();
            setDescriptions(data);
        } catch (err: any) {
            toast.error('Error', { description: err.message });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const getDescription = (aspectKey: AspectKey, areaType: string, targetRole: string): string => {
        const desc = descriptions.find(
            d => d.aspect_key === aspectKey && d.area_type === areaType && d.target_role === targetRole
        );
        return desc?.description_text || '';
    };

    const handleTextChange = (aspectKey: AspectKey, areaType: string, targetRole: string, newText: string) => {
        setDescriptions(prev => prev.map(d => {
            if (d.aspect_key === aspectKey && d.area_type === areaType && d.target_role === targetRole) {
                return { ...d, description_text: newText };
            }
            return d;
        }));
    };

    const handleSave = async (areaType: string) => {
        setIsSaving(true);
        try {
            const toSave = descriptions
                .filter(d => d.aspect_key === selectedAspect && d.area_type === areaType)
                .map(({ id, description_text }) => ({ id, description_text }));

            const res = await fetch('/api/admin/descriptions', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(toSave),
            });
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || 'Gagal menyimpan.');
            }
            toast.success('Sukses!', { description: `Deskripsi aspek "${ASPECT_FULL_NAMES[selectedAspect]}" berhasil disimpan.` });
        } catch (err: any) {
            toast.error('Gagal Menyimpan', { description: err.message });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <p className="p-4">Memuat data deskripsi aspek...</p>;

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl font-bold">Deskripsi Aspek Penilaian</h1>
                <p className="text-sm text-muted-foreground">
                    Kelola deskripsi per aspek, dipisah antara <strong>Leader</strong> dan <strong>Crew</strong>, serta per tipe area (Dine-in / Express).
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-3 flex-wrap">
                        <span>Pilih Aspek:</span>
                        <Select value={selectedAspect} onValueChange={(val) => setSelectedAspect(val as AspectKey)}>
                            <SelectTrigger className="w-[350px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {ASPECT_ORDER.map(key => (
                                    <SelectItem key={key} value={key}>
                                        {ASPECT_EMOJIS[key]} {ASPECT_FULL_NAMES[key]}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="dine_in">
                        <TabsList className="mb-4">
                            <TabsTrigger value="dine_in">{AREA_TYPE_DISPLAY_NAMES['dine_in']}</TabsTrigger>
                            <TabsTrigger value="express">{AREA_TYPE_DISPLAY_NAMES['express']}</TabsTrigger>
                        </TabsList>

                        {(['dine_in', 'express'] as const).map(areaType => (
                            <TabsContent key={areaType} value={areaType} className="space-y-4">
                                <Tabs defaultValue="leader">
                                    <div className="flex items-center justify-between mb-3">
                                        <TabsList>
                                            <TabsTrigger value="leader">Leader</TabsTrigger>
                                            <TabsTrigger value="crew">Crew</TabsTrigger>
                                        </TabsList>
                                        <Button size="sm" onClick={() => handleSave(areaType)} disabled={isSaving}>
                                            {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
                                        </Button>
                                    </div>

                                    {(['leader', 'crew'] as const).map(targetRole => (
                                        <TabsContent key={targetRole} value={targetRole} className="space-y-4">
                                            <div>
                                                <label className="text-sm font-medium mb-2 flex items-center gap-2">
                                                    <Badge variant={targetRole === 'leader' ? 'default' : 'secondary'}>
                                                        {targetRole === 'leader' ? 'Leader' : 'Crew'}
                                                    </Badge>
                                                    <span className="text-muted-foreground">di {AREA_TYPE_DISPLAY_NAMES[areaType]}</span>
                                                </label>
                                                <Textarea
                                                    className="min-h-[180px] font-mono text-sm"
                                                    value={getDescription(selectedAspect, areaType, targetRole)}
                                                    onChange={(e) => handleTextChange(selectedAspect, areaType, targetRole, e.target.value)}
                                                    placeholder={`Masukkan deskripsi untuk ${targetRole === 'leader' ? 'Leader' : 'Crew'} di ${AREA_TYPE_DISPLAY_NAMES[areaType]}...`}
                                                />
                                            </div>

                                            <div className="border rounded-lg p-4 bg-slate-50">
                                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Preview:</p>
                                                <h3 className="text-base font-bold text-[#033F3F] mb-1">
                                                    {ASPECT_EMOJIS[selectedAspect]} {ASPECT_FULL_NAMES[selectedAspect]}
                                                </h3>
                                                <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                                    {getDescription(selectedAspect, areaType, targetRole) ||
                                                        <span className="text-gray-400 italic">Belum ada deskripsi</span>}
                                                </div>
                                            </div>
                                        </TabsContent>
                                    ))}
                                </Tabs>
                            </TabsContent>
                        ))}
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}