import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

import { ensureUserAndOrg } from "@/lib/auth";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Upserts the user and auto-creates their default workspace on first load.
  const { organization } = await ensureUserAndOrg();

  return (
    <div className="flex min-h-full flex-1">
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-sidebar md:flex">
        <div className="flex h-16 items-center gap-2 border-b px-5 font-semibold">
          <span className="grid size-7 place-items-center rounded-md bg-primary text-primary-foreground text-sm">
            A
          </span>
          <Link href="/dashboard">AsyncStand</Link>
        </div>
        <SidebarNav />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b px-6">
          <div className="truncate text-sm text-muted-foreground">
            {organization.name}
          </div>
          <UserButton afterSignOutUrl="/" />
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
