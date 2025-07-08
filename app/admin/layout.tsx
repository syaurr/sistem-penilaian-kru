"use client";

import Link from "next/link";
import Image from "next/image"; // Import komponen Image
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    LayoutDashboard,
    Users,
    Building,
    CalendarClock,
    Calculator,
    PanelLeftClose,
    PanelLeftOpen,
} from "lucide-react";

type NavLink = {
    href: string;
    label: string;
    icon: React.ElementType;
};

const navLinks: NavLink[] = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/crew", label: "Kru", icon: Users },
    { href: "/admin/outlets", label: "Outlet", icon: Building },
    { href: "/admin/periods", label: "Periode", icon: CalendarClock },
    { href: "/admin/weights", label: "Bobot", icon: Calculator },
];

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isCollapsed, setIsCollapsed] = useState(false);

    return (
        <div className="flex min-h-screen w-full bg-muted/40">
            {/* --- SIDEBAR --- */}
            <aside className={cn(
                "flex h-screen flex-col border-r bg-background transition-all duration-300 ease-in-out",
                isCollapsed ? "w-16" : "w-64"
            )}>
                {/* FIX 1: Ganti Teks dengan Logo Dinamis */}
                <div className="flex h-16 items-center justify-center border-b px-4">
                    <Link href="/admin">
                        <Image
                            src="/logo.png"
                            alt="Balista Logo"
                            width={isCollapsed ? 32 : 100} // Ukuran berubah saat sidebar tertutup/terbuka
                            height={32}
                            className="transition-all duration-300"
                        />
                    </Link>
                </div>
                <nav className="flex flex-col space-y-2 p-2">
                    {navLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                        >
                            <link.icon className="h-5 w-5 flex-shrink-0" />
                            {!isCollapsed && <span className="truncate">{link.label}</span>}
                        </Link>
                    ))}
                </nav>
            </aside>

            {/* --- KONTEN UTAMA --- */}
            {/* FIX 2: Tambahkan 'overflow-hidden' pada pembungkus ini */}
            <div className="flex flex-col flex-grow overflow-hidden">
                <header className="flex h-16 items-center border-b bg-background px-4">
                    <Button variant="ghost" size="icon" onClick={() => setIsCollapsed(!isCollapsed)}>
                        {isCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
                        <span className="sr-only">Toggle Sidebar</span>
                    </Button>
                </header>
                <main className="flex-1 overflow-auto p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}