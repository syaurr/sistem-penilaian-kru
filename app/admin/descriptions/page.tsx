'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
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

    const getDescription = (aspectKey: AspectKey, areaType: string): string => {
        const desc = descriptions.find(
            d => d.aspect_key === aspectKey && d.area_type === areaType
        );
        return desc?.description_text || '';
    };

    const handleTextChange = (aspectKey: AspectKey, areaType: string, newText: string) => {
        setDescriptions(prev => prev.map(d => {
            if (d.aspect_key === aspectKey && d.area_type === areaType) {
                return { ...d, description_text: newText };
            }
            return d;
        }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await fetch('/api/admin/descriptions', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(
                    descriptions
                        .filter(d => d.aspect_key === selectedAspect)
                        .map(({ id, description_text }) => ({ id, description_text }))
                ),
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
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Deskripsi Aspek Penilaian</h1>
                    <p className="text-sm text-muted-foreground">
                        Kelola deskripsi (Final Question) per aspek untuk masing-masing tipe area outlet (Dine-in / Express).
                    </p>
                </div>
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                        <span>Pilih Aspek:</span>
                        <Select
                            value={selectedAspect}
                            onValueChange={(val) => setSelectedAspect(val as AspectKey)}
                        >
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
                        {['dine_in', 'express'].map(areaType => (
                            <TabsContent key={areaType} value={areaType} className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium mb-2 block">
                                        Deskripsi untuk {AREA_TYPE_DISPLAY_NAMES[areaType]}:
                                    </label>
                                    <Textarea
                                        className="min-h-[200px] font-mono text-sm"
                                        value={getDescription(selectedAspect, areaType)}
                                        onChange={(e) => handleTextChange(selectedAspect, areaType, e.target.value)}
                                        placeholder="Masukkan deskripsi aspek penilaian..."
                                    />
                                </div>
                                
                                {/* Preview */}
                                <div className="border rounded-lg p-4 bg-slate-50">
                                    <h4 className="text-sm font-bold mb-2 text-muted-foreground">Preview:</h4>
                                    <div className="prose prose-sm max-w-none">
                                        <h3 className="text-lg font-bold text-[#033F3F]">
                                            {ASPECT_EMOJIS[selectedAspect]} {ASPECT_FULL_NAMES[selectedAspect]}
                                        </h3>
                                        <p className="text-gray-700 leading-relaxed">
                                            {getDescription(selectedAspect, areaType) || 
                                             <span className="text-gray-400 italic">Belum ada deskripsi</span>}
                                        </p>
                                    </div>
                                </div>
                            </TabsContent>
                        ))}
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
