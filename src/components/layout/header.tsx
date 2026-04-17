"use client";

import { Menu, Sun, Moon } from "lucide-react";
import { useTheme } from "@/lib/theme-context";

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { theme, toggle } = useTheme();

  return (
    <header className="h-14 bg-white dark:bg-[#111111] border-b border-[#E4E6EB] dark:border-[#2a2a2a] px-4 md:px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button
          className="md:hidden p-2 rounded-full hover:bg-meta-sidebar dark:hover:bg-[#1c1c1c] transition-colors"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5 text-[#65676B] dark:text-[#888888]" />
        </button>
        <h2 className="text-[16px] font-semibold text-meta-dark dark:text-[#ededed]">
          Ads Reporting
        </h2>
      </div>
      <button
        onClick={toggle}
        className="p-2 rounded-lg border border-[#CED0D4] dark:border-[#2a2a2a] bg-white dark:bg-[#1a1a1a] hover:bg-[#F0F2F5] dark:hover:bg-[#2a2a2a] transition-colors"
        title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      >
        {theme === "dark" ? (
          <Sun className="h-4 w-4 text-[#F7B928]" />
        ) : (
          <Moon className="h-4 w-4 text-[#65676B]" />
        )}
      </button>
    </header>
  );
}
