"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Clock, Circle } from "lucide-react";
import type { SyncLog } from "@/lib/types";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function StatusIcon({ status }: { status: string }) {
  if (status === "success")
    return <CheckCircle2 className="h-4 w-4 text-[#31A24C]" />;
  if (status === "failed")
    return <XCircle className="h-4 w-4 text-[#E41E3F]" />;
  return <Clock className="h-4 w-4 text-[#F7B928]" />;
}

function StatusLabel({ status }: { status: string }) {
  const color =
    status === "success"
      ? "text-[#31A24C] bg-[#E7F6EC]"
      : status === "failed"
        ? "text-[#E41E3F] bg-[#FEE7EB]"
        : "text-[#F7B928] bg-[#FFF8E1]";

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-medium capitalize ${color}`}
    >
      {status}
    </span>
  );
}

export default function SettingsPage() {
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/sync-status")
      .then((r) => r.json())
      .then((data) => {
        setLogs(data);
        setLoading(false);
      });
  }, []);

  const latestMeta = logs.find((l) => l.platform === "meta");
  const latestGoogle = logs.find((l) => l.platform === "google");

  return (
    <div className="max-w-[900px] mx-auto space-y-5">
      <div>
        <h2 className="text-[20px] font-bold text-[#1C2B33]">Sync Status</h2>
        <p className="text-[13px] text-[#65676B] mt-0.5">
          Monitor data synchronization from ad platforms
        </p>
      </div>

      {/* Platform status cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Meta */}
        <div className="bg-white rounded-xl border border-[#E4E6EB] p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#1877F2] flex items-center justify-center">
              <span className="text-white font-bold text-[14px]">M</span>
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-[#1C2B33]">
                Meta Ads
              </h3>
              <p className="text-[12px] text-[#8A8D91]">
                Facebook & Instagram
              </p>
            </div>
          </div>
          {latestMeta ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[13px] text-[#65676B]">Status</span>
                <StatusLabel status={latestMeta.status} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[13px] text-[#65676B]">Last sync</span>
                <span className="text-[13px] text-[#1C2B33]">
                  {formatTime(latestMeta.started_at)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[13px] text-[#65676B]">Records</span>
                <span className="text-[13px] text-[#1C2B33] font-medium">
                  {latestMeta.records}
                </span>
              </div>
              {latestMeta.error && (
                <div className="mt-3 p-3 bg-[#FEE7EB] rounded-lg">
                  <p className="text-[12px] text-[#E41E3F]">
                    {latestMeta.error}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-[13px] text-[#8A8D91]">
              {loading ? "Loading..." : "No sync data yet"}
            </p>
          )}
        </div>

        {/* Google */}
        <div className="bg-white rounded-xl border border-[#E4E6EB] p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#E4E6EB] flex items-center justify-center">
              <span className="text-[#8A8D91] font-bold text-[14px]">G</span>
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-[#1C2B33]">
                Google Ads
              </h3>
              <p className="text-[12px] text-[#8A8D91]">
                Search, Display & YouTube
              </p>
            </div>
          </div>
          {latestGoogle ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[13px] text-[#65676B]">Status</span>
                <StatusLabel status={latestGoogle.status} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[13px] text-[#65676B]">Last sync</span>
                <span className="text-[13px] text-[#1C2B33]">
                  {formatTime(latestGoogle.started_at)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[13px] text-[#65676B]">Records</span>
                <span className="text-[13px] text-[#1C2B33] font-medium">
                  {latestGoogle.records}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Circle className="h-2.5 w-2.5 text-[#8A8D91] fill-current" />
              <p className="text-[13px] text-[#8A8D91]">
                {loading ? "Loading..." : "Not connected — Phase 2"}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Sync history */}
      <div className="bg-white rounded-xl border border-[#E4E6EB] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E4E6EB]">
          <h3 className="text-[15px] font-semibold text-[#1C2B33]">
            Sync History
          </h3>
        </div>
        {loading ? (
          <div className="p-5 text-[13px] text-[#8A8D91]">Loading...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-[13px] text-[#65676B]">No sync history yet</p>
            <p className="text-[12px] text-[#8A8D91] mt-1">
              Data will appear after the first GitHub Actions run
            </p>
          </div>
        ) : (
          <div>
            {logs.map((log, i) => (
              <div
                key={log.id}
                className={`flex items-center justify-between px-5 py-3.5 ${
                  i !== logs.length - 1 ? "border-b border-[#E4E6EB]" : ""
                } hover:bg-[#F8F9FA] transition-colors`}
              >
                <div className="flex items-center gap-3">
                  <StatusIcon status={log.status} />
                  <div>
                    <span className="text-[14px] font-medium text-[#1C2B33] capitalize">
                      {log.platform} Ads
                    </span>
                    <p className="text-[12px] text-[#8A8D91]">
                      {formatTime(log.started_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[13px] text-[#65676B]">
                    {log.records} records
                  </span>
                  <StatusLabel status={log.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
