"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LINKS } from "./SidebarNav";

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
      {LINKS.map((link) => {
        const active = pathname === link.href;
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] ${
              active ? "text-blue-600" : "text-slate-500"
            }`}
          >
            <Icon size={20} strokeWidth={active ? 2.5 : 2} />
            {link.shortLabel}
          </Link>
        );
      })}
    </nav>
  );
}
