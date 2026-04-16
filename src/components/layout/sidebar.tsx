"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ClipboardList,
  Columns3,
  Calendar,
  Settings,
  RefreshCw,
  Menu,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/submissions", label: "Submissions", icon: ClipboardList },
  { href: "/kanban", label: "Kanban", icon: Columns3 },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [syncing, setSyncing] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch("/api/psa/sync", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        const synced = data.results?.filter((r: { synced: boolean }) => r.synced).length ?? 0;
        toast.success(`Synced ${synced} submission(s) with PSA`);
      } else {
        toast.error(data.error || "Sync failed");
      }
    } catch {
      toast.error("Failed to connect to PSA API");
    } finally {
      setSyncing(false);
    }
  }

  const navContent = (
    <>
      {/* Logo */}
      <div className="p-5 pb-6">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="relative h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-tight">PSA Tracker</h1>
            <p className="text-[11px] text-muted-foreground font-medium">Submission Tracker</p>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-1">
        <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
          Menu
        </p>
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200",
                isActive
                  ? "bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-md shadow-indigo-500/25"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <item.icon className={cn(
                "h-[18px] w-[18px] transition-transform duration-200",
                !isActive && "group-hover:scale-110"
              )} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Sync Button */}
      <div className="p-3 mx-3 mb-3">
        <button
          onClick={handleSync}
          disabled={syncing}
          className={cn(
            "w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200",
            "bg-gradient-to-r from-indigo-500/10 to-purple-500/10 text-indigo-600 hover:from-indigo-500/20 hover:to-purple-500/20",
            "border border-indigo-500/20",
            syncing && "opacity-70 cursor-not-allowed"
          )}
        >
          <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
          {syncing ? "Syncing..." : "Sync with PSA"}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:sticky top-0 left-0 z-40 h-screen w-[260px] border-r bg-card/80 backdrop-blur-xl text-sidebar-foreground flex flex-col transition-transform lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {navContent}
      </aside>
    </>
  );
}
