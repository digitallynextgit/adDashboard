"use client";

import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BarChart3,
  Settings,
  TrendingUp,
  Megaphone,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/settings", label: "Sync Status", icon: Settings },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        // Mobile: fixed drawer
        "fixed inset-y-0 left-0 z-50 w-[240px] bg-white border-r border-[#E4E6EB] flex flex-col",
        "transition-transform duration-200 ease-in-out",
        isOpen ? "translate-x-0" : "-translate-x-full",
        // Desktop: static sidebar, always visible
        "md:static md:z-auto md:translate-x-0 md:transition-none md:min-h-screen md:flex-shrink-0"
      )}
    >
      {/* Logo */}
      <div className="px-4 py-4 border-b border-[#E4E6EB]">
        <div className="flex items-center justify-between">
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
          <button
            className="md:hidden p-1.5 rounded-lg hover:bg-[#F0F2F5] transition-colors"
            onClick={onClose}
          >
            <X className="h-4 w-4 text-[#65676B]" />
          </button>
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
                onClick={onClose}
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
