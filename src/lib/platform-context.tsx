"use client";

import { createContext, useContext, useState } from "react";

export type Platform = "meta" | "google" | "amazon" | "flipkart";

export type PlatformStatus = "connected" | "preparing" | "planned";

export interface PlatformConfig {
  id: Platform;
  label: string;
  description: string;
  color: string;
  initial: string;
  connected: boolean;
  status: PlatformStatus;
}

export const PLATFORMS: PlatformConfig[] = [
  { id: "meta",     label: "Meta Ads",     description: "Facebook & Instagram", color: "#1877F2", initial: "M", connected: true,  status: "connected"  },
  { id: "google",   label: "Google Ads",   description: "Search & YouTube",     color: "#EA4335", initial: "G", connected: false, status: "planned"    },
  { id: "amazon",   label: "Amazon Ads",   description: "Sponsored Products",   color: "#FF9900", initial: "A", connected: true,  status: "connected"  },
  { id: "flipkart", label: "Flipkart Ads", description: "Product & Display Ads",color: "#2874F0", initial: "F", connected: true,  status: "preparing"  },
];

interface PlatformContextValue {
  platform: Platform;
  config: PlatformConfig;
  setPlatform: (p: Platform) => void;
}

const PlatformContext = createContext<PlatformContextValue>({
  platform: "meta",
  config: PLATFORMS[0],
  setPlatform: () => {},
});

export function PlatformProvider({ children }: { children: React.ReactNode }) {
  const [platform, setPlatform] = useState<Platform>("meta");
  const config = PLATFORMS.find((p) => p.id === platform)!;

  return (
    <PlatformContext.Provider value={{ platform, config, setPlatform }}>
      {children}
    </PlatformContext.Provider>
  );
}

export function usePlatform() {
  return useContext(PlatformContext);
}
