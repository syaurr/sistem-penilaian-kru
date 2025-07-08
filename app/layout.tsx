import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
// 1. GANTI IMPORT INI
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Sistem Penilaian Kru Balista",
  description: "Penilaian kinerja kru",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <main>{children}</main>
        {/* 2. GANTI KOMPONEN INI DENGAN YANG BARU */}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}