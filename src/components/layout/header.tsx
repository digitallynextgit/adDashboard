"use client";

import { Bell, Search, CircleUser } from "lucide-react";

export function Header() {
  return (
    <header className="h-[56px] bg-white border-b border-[#E4E6EB] px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <h2 className="text-[16px] font-semibold text-[#1C2B33]">
          Ads Reporting
        </h2>
      </div>
      <div className="flex items-center gap-2">
        <button className="p-2 rounded-full hover:bg-[#F0F2F5] transition-colors">
          <Search className="h-5 w-5 text-[#65676B]" />
        </button>
        <button className="p-2 rounded-full hover:bg-[#F0F2F5] transition-colors">
          <Bell className="h-5 w-5 text-[#65676B]" />
        </button>
        <button className="p-2 rounded-full hover:bg-[#F0F2F5] transition-colors">
          <CircleUser className="h-5 w-5 text-[#65676B]" />
        </button>
      </div>
    </header>
  );
}
