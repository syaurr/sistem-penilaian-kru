'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function SettingsPage() {
    const [tiktokUrl, setTiktokUrl] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    // Ambil data link saat ini
    useEffect(() => {
        const fetchSettings = async () => {
            setIsLoading(true);
            try {
                // Gunakan API publik untuk mengambil data awal
                const res = await fetch('/api/setting?key=tiktok_success_url');
                const data = await res.json();
                if (data.value) {
                    setTiktokUrl(data.value);
                }
            } catch (error) {
                toast.error("Gagal memuat pengaturan.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleSave = async () => {
        try {
            const response = await fetch('/api/admin/setting', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    key: 'tiktok_success_url',
                    value: tiktokUrl,
                }),
            });
            if (!response.ok) throw new Error("Gagal menyimpan perubahan.");
            toast.success("Pengaturan berhasil disimpan!");
        } catch (error: any) {
            toast.error("Error", { description: error.message });
        }
    };

    if (isLoading) return <div>Memuat pengaturan...</div>;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Pengaturan Aplikasi</h1>
            <Card>
                <CardHeader>
                    <CardTitle>Konten Dinamis</CardTitle>
                    <CardDescription>Pastikan video tidak terkunci privacy.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="tiktokUrl">URL Video TikTok</Label>
                        <Input
                            id="tiktokUrl"
                            value={tiktokUrl}
                            onChange={(e) => setTiktokUrl(e.target.value)}
                            placeholder="https://www.tiktok.com/@username/video/12345..."
                        />
                    </div>
                    <Button onClick={handleSave}>Simpan Perubahan</Button>
                </CardContent>
            </Card>
        </div>
    );
}