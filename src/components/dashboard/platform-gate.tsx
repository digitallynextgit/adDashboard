"use client";

import { Lock, Construction } from "lucide-react";
import type { PlatformConfig } from "@/lib/platform-context";

export function PlatformGate({ config }: { config: PlatformConfig }) {
  const isPreparing = config.status === "preparing";

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 text-white text-[24px] font-bold"
        style={{ backgroundColor: config.color }}
      >
        {config.initial}
      </div>

      <h2 className="text-[20px] font-bold text-[#1C2B33] dark:text-[#ededed] mb-2">
        {config.label} — {isPreparing ? "Preparing" : "Coming Soon"}
      </h2>

      <p className="text-[14px] text-[#65676B] dark:text-[#888888] max-w-[400px] mb-6 leading-relaxed">
        {isPreparing
          ? `Infrastructure for ${config.label} is ready. Credentials are being configured — data will start flowing in as soon as your first campaign goes live.`
          : `${config.description} integration is in the pipeline. Once connected, all dashboard pages will automatically show ${config.label} data here.`
        }
      </p>

      <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border ${
        isPreparing
          ? "bg-[#FFFBEB] dark:bg-[#78350F]/20 border-[#FDE68A] dark:border-[#78350F]"
          : "bg-[#F0F2F5] dark:bg-[#1a1a1a] border-[#E4E6EB] dark:border-[#2a2a2a]"
      }`}>
        {isPreparing
          ? <Construction className="h-4 w-4 text-[#F7B928]" />
          : <Lock className="h-4 w-4 text-[#8A8D91] dark:text-[#616161]" />
        }
        <span className={`text-[13px] font-medium ${
          isPreparing ? "text-[#92400E] dark:text-[#FCD34D]" : "text-[#65676B] dark:text-[#888888]"
        }`}>
          {isPreparing ? "Infrastructure ready — awaiting first campaign" : "Not connected yet"}
        </span>
      </div>
    </div>
  );
}
