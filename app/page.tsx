'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // GANTI "KBP" DENGAN KODE OUTLET DEFAULT ANDA
    router.replace('/nilai/KBP');
  }, [router]);

  return (
    <div className="flex justify-center items-center h-screen">
      <p>Mengarahkan ke halaman penilaian...</p>
    </div>
  );
}