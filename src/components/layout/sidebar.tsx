"use client";

import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BarChart3,
  Settings,
  Megaphone,
  CalendarRange,
  X,
  Lock,
  Construction,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePlatform, PLATFORMS, type Platform } from "@/lib/platform-context";

const navItems = [
  { href: "/",          label: "Overview",     icon: LayoutDashboard, platforms: null        },
  { href: "/campaigns", label: "Campaigns",    icon: Megaphone,       platforms: ["meta"]    },
  { href: "/weekly",    label: "Weekly Report",icon: CalendarRange,   platforms: ["meta"]    },
  { href: "/settings",  label: "Sync Status",  icon: Settings,        platforms: null        },
];
// platforms: null  = show for all platforms
// platforms: [...] = show only for those platforms

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { platform, setPlatform } = usePlatform();

  function handlePlatformClick(p: typeof PLATFORMS[0]) {
    // "planned" platforms are fully locked; "preparing" can be selected to show the gate
    if (p.status === "planned") return;
    setPlatform(p.id);
  }

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 w-[240px] bg-white dark:bg-[#111111] border-r border-[#E4E6EB] dark:border-[#2a2a2a] flex flex-col",
        "transition-transform duration-200 ease-in-out",
        isOpen ? "translate-x-0" : "-translate-x-full",
        "md:sticky md:top-0 md:h-screen md:z-auto md:translate-x-0 md:transition-none md:flex-shrink-0"
      )}
    >
      {/* Logo */}
      <div className="px-4 py-4 border-b border-[#E4E6EB] dark:border-[#2a2a2a]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1877F2] flex items-center justify-center">
              <BarChart3 className="h-4.5 w-4.5 text-white" />
            </div>
            <div>
              <h1 className="text-[15px] font-semibold text-[#1C2B33] dark:text-[#ededed]">AdAuto</h1>
              <p className="text-[11px] text-[#65676B] dark:text-[#888888] leading-tight">Ads Dashboard</p>
            </div>
          </div>
          <button
            className="md:hidden p-1.5 rounded-lg hover:bg-[#F0F2F5] dark:hover:bg-[#1c1c1c] transition-colors"
            onClick={onClose}
          >
            <X className="h-4 w-4 text-[#65676B] dark:text-[#888888]" />
          </button>
        </div>
      </div>

      {/* Platform switcher */}
      <div className="px-3 py-3 border-b border-[#E4E6EB] dark:border-[#2a2a2a]">
        <p className="text-[10px] font-semibold text-[#8A8D91] dark:text-[#616161] uppercase tracking-widest px-1 mb-2">
          Platform
        </p>
        <div className="space-y-0.5">
          {PLATFORMS.map((p) => {
            const isActive    = platform === p.id;
            const isPlanned   = p.status === "planned";
            const isPreparing = p.status === "preparing";

            return (
              <button
                key={p.id}
                onClick={() => handlePlatformClick(p)}
                disabled={isPlanned}
                className={cn(
                  "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors",
                  isActive
                    ? "bg-[#EBF5FF] dark:bg-[#0c1a2e]"
                    : isPlanned
                      ? "opacity-40 cursor-not-allowed"
                      : "hover:bg-[#F0F2F5] dark:hover:bg-[#1c1c1c] cursor-pointer"
                )}
              >
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 text-white text-[10px] font-bold"
                  style={{ backgroundColor: isPlanned ? "#9CA3AF" : p.color }}
                >
                  {p.initial}
                </div>

                <div className="flex-1 min-w-0">
                  <div className={cn(
                    "text-[13px] font-medium truncate",
                    isActive    ? "text-[#1877F2]"                        :
                    isPlanned   ? "text-[#8A8D91] dark:text-[#616161]"   :
                                  "text-[#1C2B33] dark:text-[#ededed]"
                  )}>
                    {p.label}
                  </div>
                </div>

                {isPlanned   ? <Lock         className="h-3 w-3 text-[#8A8D91] dark:text-[#616161] flex-shrink-0" /> :
                 isPreparing && !isActive ? <Construction className="h-3 w-3 text-[#F7B928] flex-shrink-0" /> :
                 isActive    ? <div className="w-1.5 h-1.5 rounded-full bg-[#1877F2] flex-shrink-0" /> :
                 null}
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto">
        <p className="text-[10px] font-semibold text-[#8A8D91] dark:text-[#616161] uppercase tracking-widest px-1 mb-2">
          Navigation
        </p>
        <div className="space-y-0.5">
          {navItems.filter((item) => !item.platforms || item.platforms.includes(platform)).map((item) => {
            const isActive =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const isSyncStatus = item.href === "/settings";

            return (
              <a
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] font-medium transition-colors",
                  isActive
                    ? "bg-[#EBF5FF] dark:bg-[#0c1a2e] text-[#1877F2]"
                    : "text-[#1C1E21] dark:text-[#ededed] hover:bg-[#F0F2F5] dark:hover:bg-[#1c1c1c]"
                )}
              >
                <item.icon className={cn(
                  "h-5 w-5",
                  isActive ? "text-[#1877F2]" : "text-[#65676B] dark:text-[#888888]"
                )} />
                <span className="flex-1">{item.label}</span>
                {isSyncStatus && (
                  <span className="text-[10px] font-semibold text-[#8A8D91] dark:text-[#616161] bg-[#F0F2F5] dark:bg-[#1a1a1a] px-1.5 py-0.5 rounded">
                    ALL
                  </span>
                )}
              </a>
            );
          })}
        </div>
      </nav>

      {/* Bottom status */}
      <div className="px-4 py-4 border-t border-[#E4E6EB] dark:border-[#2a2a2a]">
        {(() => {
          const active = PLATFORMS.find((p) => p.id === platform);
          if (!active) return null;
          const isConnected = active.status === "connected";
          return (
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: isConnected ? "#31A24C" : "#F7B928" }} />
              <span className="text-[12px] text-[#65676B] dark:text-[#888888] truncate">
                {active.label} {isConnected ? "Connected" : "Preparing"}
              </span>
            </div>
          );
        })()}
      </div>
    </aside>
  );
}
