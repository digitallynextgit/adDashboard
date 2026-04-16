"use client";

import { Bell, Search, CircleUser, Menu } from "lucide-react";

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="h-[56px] bg-white border-b border-[#E4E6EB] px-4 md:px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button
          className="md:hidden p-2 rounded-full hover:bg-[#F0F2F5] transition-colors"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5 text-[#65676B]" />
        </button>
        <h2 className="text-[16px] font-semibold text-[#1C2B33]">
          Ads Reporting
        </h2>
      </div>
    </header>
  );
}
