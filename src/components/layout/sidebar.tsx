"use client";

import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BarChart3,
  Settings,
  TrendingUp,
  Megaphone,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/settings", label: "Sync Status", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[240px] min-h-screen bg-white border-r border-[#E4E6EB] flex flex-col">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-[#E4E6EB]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#1877F2] flex items-center justify-center">
            <BarChart3 className="h-4.5 w-4.5 text-white" />
          </div>
          <div>
            <h1 className="text-[15px] font-semibold text-[#1C2B33]">
              AdAuto
            </h1>
            <p className="text-[11px] text-[#65676B] leading-tight">
              Ads Dashboard
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3">
        <div className="space-y-0.5">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <a
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] font-medium transition-colors",
                  isActive
                    ? "bg-[#EBF5FF] text-[#1877F2]"
                    : "text-[#1C1E21] hover:bg-[#F0F2F5]"
                )}
              >
                <item.icon
                  className={cn(
                    "h-5 w-5",
                    isActive ? "text-[#1877F2]" : "text-[#65676B]"
                  )}
                />
                {item.label}
              </a>
            );
          })}
        </div>
      </nav>

      {/* Bottom section */}
      <div className="px-4 py-4 border-t border-[#E4E6EB]">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-[#31A24C]" />
          <span className="text-[12px] text-[#65676B]">Meta Ads Connected</span>
        </div>
      </div>
    </aside>
  );
}
