"use client";

import { useEffect, useState, use, useCallback } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RefreshCw, Loader2, ArrowLeft } from "lucide-react";

import { getService } from "@/lib/integrations";
import type { Digest } from "@/lib/integrations";
import { DateFilter, getDateRange } from "@/components/dashboard/date-filter";
import {
  MetaPanel, ShopifyPanel, AmazonPanel, FlipkartPanel,
  Ga4Panel, GscPanel, ClarityPanel, GokwikPanel,
} from "@/components/integrations/panels";

interface PageProps {
  params: Promise<{ service: string }>;
}

export default function ServiceDetailPage({ params }: PageProps) {
  const { service: serviceId } = use(params);
  const meta = getService(serviceId);

  const [data, setData] = useState<Digest | null>(null);
  const [loading, setLoading] = useState(true);
  const [start, setStart] = useState(() => getDateRange("60d").start);
  const [end,   setEnd]   = useState(() => getDateRange("60d").end);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/integrations?start_date=${start}&end_date=${end}`);
      const json = await res.json();
      if (!json.error) setData(json);
    } finally { setLoading(false); }
  }, [start, end]);

  useEffect(() => { load(); }, [load]);

  if (!meta) notFound();

  return (
    <div className="max-w-300 mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          <Link
            href="/integrations"
            className="p-2 rounded-lg border border-[#CED0D4] dark:border-[#2a2a2a] bg-white dark:bg-[#111111] hover:bg-meta-sidebar dark:hover:bg-[#1c1c1c] transition-colors"
            title="Back to integrations"
          >
            <ArrowLeft className="h-4 w-4 text-[#65676B] dark:text-[#888888]" />
          </Link>
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-[14px] font-bold shrink-0"
            style={{ backgroundColor: meta.color }}
          >
            {meta.initial}
          </div>
          <div>
            <h2 className="text-[20px] font-bold text-meta-dark dark:text-[#ededed]">{meta.label}</h2>
            <p className="text-[13px] text-[#65676B] dark:text-[#888888] mt-0.5">
              {meta.description}
              {data && (
                <> · <span className="text-[#8A8D91] dark:text-[#616161]">{data.window.start} → {data.window.end}</span></>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 self-start">
          <button
            onClick={load}
            disabled={loading}
            className="p-2 rounded-lg border border-[#CED0D4] dark:border-[#2a2a2a] bg-white dark:bg-[#111111] hover:bg-meta-sidebar dark:hover:bg-[#1c1c1c] transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 text-[#65676B] dark:text-[#888888] ${loading ? "animate-spin" : ""}`} />
          </button>
          <DateFilter start={start} end={end} onChange={(s, e) => { setStart(s); setEnd(e); }} />
        </div>
      </div>

      {/* Body */}
      {!data ? (
        <div className="bg-white dark:bg-[#111111] rounded-xl border border-[#E4E6EB] dark:border-[#2a2a2a] p-10 text-center text-[14px] text-[#65676B] dark:text-[#888888] flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading {meta.label}…
        </div>
      ) : (
        <>
          {meta.id === "meta"     && <MetaPanel     d={data.meta} />}
          {meta.id === "shopify"  && <ShopifyPanel  d={data.shopify} />}
          {meta.id === "amazon"   && <AmazonPanel   d={data.amazon} />}
          {meta.id === "flipkart" && <FlipkartPanel d={data.flipkart} />}
          {meta.id === "ga4"      && <Ga4Panel      d={data.ga4} />}
          {meta.id === "gsc"      && <GscPanel      d={data.gsc} />}
          {meta.id === "clarity"  && <ClarityPanel  d={data.clarity} />}
          {meta.id === "gokwik"   && <GokwikPanel   d={data.gokwik} />}
        </>
      )}
    </div>
  );
}
