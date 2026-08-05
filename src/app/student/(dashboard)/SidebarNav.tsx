"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BarChart3, User } from "lucide-react";

export const LINKS = [
  { href: "/student", label: "Dashboard", shortLabel: "Home", icon: LayoutDashboard },
  { href: "/student/results", label: "My results", shortLabel: "Results", icon: BarChart3 },
  { href: "/student/profile", label: "Profile", shortLabel: "Profile", icon: User },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 text-sm">
      {LINKS.map((link) => {
        const active = pathname === link.href;
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center gap-2.5 rounded-md px-3 py-2 ${
              active ? "bg-blue-50 font-medium text-blue-700" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Icon size={18} strokeWidth={active ? 2.5 : 2} />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
