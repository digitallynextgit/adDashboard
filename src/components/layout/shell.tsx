"use client";

import { useState } from "react";
import { ThemeProvider } from "@/lib/theme-context";
import { PlatformProvider } from "@/lib/platform-context";
import { Sidebar } from "./sidebar";
import { Header } from "./header";

export function Shell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ThemeProvider>
      <PlatformProvider>
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
      </PlatformProvider>
    </ThemeProvider>
  );
}
