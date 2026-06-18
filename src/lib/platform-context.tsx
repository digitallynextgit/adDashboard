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

// Amazon Ads and Flipkart Ads have been moved out of the PLATFORM switcher
// and into the Integrations page. The Platform type still includes their IDs
// so existing code paths (api routes, type guards) don't need to change.
export const PLATFORMS: PlatformConfig[] = [
  { id: "meta",   label: "Meta Ads",   description: "Facebook & Instagram", color: "#1877F2", initial: "M", connected: true,  status: "connected" },
  { id: "google", label: "Google Ads", description: "Search & YouTube",     color: "#EA4335", initial: "G", connected: false, status: "planned"   },
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
