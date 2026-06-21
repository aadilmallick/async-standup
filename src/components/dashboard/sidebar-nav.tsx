"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarClock,
  LayoutDashboard,
  ListChecks,
  type LucideIcon,
  Settings,
  Megaphone,
} from "lucide-react";

import { cn } from "@/lib/utils";

const items: { href: string; label: string; icon: LucideIcon; exact?: boolean }[] =
  [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { href: "/dashboard/templates", label: "Templates", icon: ListChecks },
    { href: "/dashboard/sessions", label: "Sessions", icon: Megaphone },
    {
      href: "/dashboard/schedules",
      label: "Recurring Schedules",
      icon: CalendarClock,
    },
    { href: "/dashboard/settings", label: "Settings", icon: Settings },
  ];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 p-3">
      {items.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
            )}
          >
            <item.icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
