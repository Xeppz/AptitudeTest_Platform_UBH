"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const BASE_LINKS = [{ href: "/teacher", label: "Dashboard" }];
const ADMIN_LINKS = [{ href: "/teacher/students", label: "Students" }];

export function SidebarNav({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const links = isAdmin ? [...BASE_LINKS, ...ADMIN_LINKS] : BASE_LINKS;

  return (
    <nav className="flex flex-col gap-1 text-sm">
      {links.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-md px-3 py-2 ${
              active ? "bg-blue-50 font-medium text-blue-700" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
