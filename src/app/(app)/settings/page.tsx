"use client";

import { useEffect, useState, useCallback } from "react";
import { CheckCircle2, XCircle, Clock, Circle, Save, Construction } from "lucide-react";
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
      ? "text-[#31A24C] bg-[#E7F6EC] dark:bg-[#064E3B]/40"
      : status === "failed"
        ? "text-[#E41E3F] bg-[#FEE7EB] dark:bg-[#7F1D1D]/40"
        : "text-[#F7B928] bg-[#FFF8E1] dark:bg-[#78350F]/40";

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-medium capitalize ${color}`}
    >
      {status}
    </span>
  );
}

// --- Planned Spend helpers ---

function getMonday(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function fmtDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmtWeekLabel(mondayStr: string): string {
  const monday = new Date(mondayStr + "T00:00:00");
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  return `${monday.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – ${sunday.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`;
}

function generateWeeks(): string[] {
  const today = new Date();
  const currentMonday = getMonday(today);
  const weeks: string[] = [];
  for (let i = -8; i <= 3; i++) {
    const d = new Date(currentMonday);
    d.setDate(d.getDate() + i * 7);
    weeks.push(fmtDateKey(d));
  }
  return weeks;
}

const DEFAULT_PLANNED_SPEND = 50000;

export default function SettingsPage() {
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);

  const [spendMap, setSpendMap] = useState<
    Record<string, { value: string; saving: boolean; saved: boolean; error: string }>
  >({});
  const [spendLoading, setSpendLoading] = useState(true);

  const weeks = generateWeeks();

  useEffect(() => {
    fetch("/api/sync-status")
      .then((r) => r.json())
      .then((data) => {
        setLogs(data);
        setLoading(false);
      });
  }, []);

  const loadPlannedSpend = useCallback(async () => {
    setSpendLoading(true);
    const start = weeks[0];
    const end = weeks[weeks.length - 1];
    const res = await fetch(`/api/planned-spend?start_date=${start}&end_date=${end}`);
    const data = await res.json();

    const initial: Record<string, { value: string; saving: boolean; saved: boolean; error: string }> = {};
    const existing = new Map<string, number>(
      (data.planned_spend || []).map((r: { week_start: string; planned_spend: number }) => [r.week_start, r.planned_spend])
    );

    for (const w of weeks) {
      const val = existing.has(w) ? existing.get(w)! : DEFAULT_PLANNED_SPEND;
      initial[w] = { value: String(val), saving: false, saved: false, error: "" };
    }

    setSpendMap(initial);
    setSpendLoading(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadPlannedSpend();
  }, [loadPlannedSpend]);

  async function saveWeek(weekStart: string) {
    const entry = spendMap[weekStart];
    const val = parseFloat(entry.value);
    if (isNaN(val) || val < 0) {
      setSpendMap((prev) => ({
        ...prev,
        [weekStart]: { ...prev[weekStart], error: "Enter a valid amount" },
      }));
      return;
    }

    setSpendMap((prev) => ({
      ...prev,
      [weekStart]: { ...prev[weekStart], saving: true, error: "" },
    }));

    const res = await fetch("/api/planned-spend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ week_start: weekStart, planned_spend: val }),
    });

    if (res.ok) {
      setSpendMap((prev) => ({
        ...prev,
        [weekStart]: { ...prev[weekStart], saving: false, saved: true },
      }));
      setTimeout(() => {
        setSpendMap((prev) => ({
          ...prev,
          [weekStart]: { ...prev[weekStart], saved: false },
        }));
      }, 2000);
    } else {
      setSpendMap((prev) => ({
        ...prev,
        [weekStart]: { ...prev[weekStart], saving: false, error: "Failed to save" },
      }));
    }
  }

  const latestMeta = logs.find((l) => l.platform === "meta");
  const latestGoogle = logs.find((l) => l.platform === "google");
  const currentMondayStr = fmtDateKey(getMonday(new Date()));

  return (
    <div className="max-w-[900px] mx-auto space-y-5">
      <div>
        <h2 className="text-[20px] font-bold text-[#1C2B33] dark:text-[#ededed]">Settings</h2>
        <p className="text-[13px] text-[#65676B] dark:text-[#888888] mt-0.5">
          Sync status and campaign configuration
        </p>
      </div>

      {/* Platform status cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Meta */}
        <div className="bg-white dark:bg-[#111111] rounded-xl border border-[#E4E6EB] dark:border-[#2a2a2a] p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#1877F2] flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-[14px]">M</span>
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-[#1C2B33] dark:text-[#ededed]">Meta Ads</h3>
              <p className="text-[12px] text-[#8A8D91] dark:text-[#616161]">Facebook & Instagram</p>
            </div>
            <span className="ml-auto text-[11px] font-medium text-[#31A24C] bg-[#E7F6EC] dark:bg-[#064E3B]/40 px-2.5 py-0.5 rounded-full">Connected</span>
          </div>
          {latestMeta ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[13px] text-[#65676B] dark:text-[#888888]">Status</span>
                <StatusLabel status={latestMeta.status} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[13px] text-[#65676B] dark:text-[#888888]">Last sync</span>
                <span className="text-[13px] text-[#1C2B33] dark:text-[#ededed]">{formatTime(latestMeta.started_at)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[13px] text-[#65676B] dark:text-[#888888]">Records</span>
                <span className="text-[13px] text-[#1C2B33] dark:text-[#ededed] font-medium">{latestMeta.records}</span>
              </div>
              {latestMeta.error && (
                <div className="mt-3 p-3 bg-[#FEE7EB] dark:bg-[#7F1D1D]/40 rounded-lg">
                  <p className="text-[12px] text-[#E41E3F]">{latestMeta.error}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-[13px] text-[#8A8D91] dark:text-[#616161]">{loading ? "Loading..." : "No sync data yet"}</p>
          )}
        </div>

        {/* Google */}
        <div className="bg-white dark:bg-[#111111] rounded-xl border border-[#E4E6EB] dark:border-[#2a2a2a] p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#E4E6EB] dark:bg-[#1a1a1a] flex items-center justify-center flex-shrink-0">
              <span className="text-[#8A8D91] dark:text-[#888888] font-bold text-[14px]">G</span>
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-[#1C2B33] dark:text-[#ededed]">Google Ads</h3>
              <p className="text-[12px] text-[#8A8D91] dark:text-[#616161]">Search, Display & YouTube</p>
            </div>
            <span className="ml-auto text-[11px] font-medium text-[#65676B] dark:text-[#888888] bg-[#F0F2F5] dark:bg-[#1a1a1a] px-2.5 py-0.5 rounded-full">Planned</span>
          </div>
          {latestGoogle ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[13px] text-[#65676B] dark:text-[#888888]">Status</span>
                <StatusLabel status={latestGoogle.status} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[13px] text-[#65676B] dark:text-[#888888]">Last sync</span>
                <span className="text-[13px] text-[#1C2B33] dark:text-[#ededed]">{formatTime(latestGoogle.started_at)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[13px] text-[#65676B] dark:text-[#888888]">Records</span>
                <span className="text-[13px] text-[#1C2B33] dark:text-[#ededed] font-medium">{latestGoogle.records}</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 mt-1">
              <Construction className="h-4 w-4 text-[#F7B928]" />
              <p className="text-[13px] text-[#8A8D91] dark:text-[#616161]">Integration in pipeline — not yet connected</p>
            </div>
          )}
        </div>

        {/* Amazon */}
        <div className="bg-white dark:bg-[#111111] rounded-xl border border-[#E4E6EB] dark:border-[#2a2a2a] p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#FF9900] flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-[14px]">A</span>
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-[#1C2B33] dark:text-[#ededed]">Amazon Ads</h3>
              <p className="text-[12px] text-[#8A8D91] dark:text-[#616161]">Sponsored Products & Brands</p>
            </div>
            <span className="ml-auto text-[11px] font-medium text-[#65676B] dark:text-[#888888] bg-[#F0F2F5] dark:bg-[#1a1a1a] px-2.5 py-0.5 rounded-full">Planned</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Construction className="h-4 w-4 text-[#F7B928]" />
            <p className="text-[13px] text-[#8A8D91] dark:text-[#616161]">Integration in pipeline — not yet connected</p>
          </div>
          <div className="mt-4 pt-4 border-t border-[#E4E6EB] dark:border-[#2a2a2a] space-y-2">
            <p className="text-[12px] text-[#8A8D91] dark:text-[#616161]">Will include:</p>
            <div className="flex flex-wrap gap-1.5">
              {["Sponsored Products", "Sponsored Brands", "Sponsored Display", "ACOS", "TACOS"].map((tag) => (
                <span key={tag} className="text-[11px] text-[#65676B] dark:text-[#888888] bg-[#F0F2F5] dark:bg-[#1a1a1a] px-2 py-0.5 rounded-md">{tag}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Flipkart */}
        <div className="bg-white dark:bg-[#111111] rounded-xl border border-[#E4E6EB] dark:border-[#2a2a2a] p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#2874F0] flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-[14px]">F</span>
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-[#1C2B33] dark:text-[#ededed]">Flipkart Ads</h3>
              <p className="text-[12px] text-[#8A8D91] dark:text-[#616161]">Product Listing & Smart ROI Ads</p>
            </div>
            <span className="ml-auto text-[11px] font-medium text-[#F7B928] bg-[#FFF8E1] dark:bg-[#78350F]/40 px-2.5 py-0.5 rounded-full">Preparing</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Construction className="h-4 w-4 text-[#F7B928]" />
            <p className="text-[13px] text-[#8A8D91] dark:text-[#616161]">Add credentials to scripts/.env to activate</p>
          </div>
          <div className="mt-4 pt-4 border-t border-[#E4E6EB] dark:border-[#2a2a2a] space-y-1.5">
            <p className="text-[12px] text-[#8A8D91] dark:text-[#616161]">Add to scripts/.env:</p>
            <div className="overflow-x-auto">
              <code className="block text-[11px] text-[#2874F0] bg-[#EFF6FF] dark:bg-[#0c1a2e] px-3 py-2 rounded-lg font-mono whitespace-pre">
{`FLIPKART_CLIENT_ID=...
FLIPKART_CLIENT_SECRET=...`}
              </code>
            </div>
          </div>
        </div>
      </div>

      {/* Planned Spend */}
      <div className="bg-white dark:bg-[#111111] rounded-xl border border-[#E4E6EB] dark:border-[#2a2a2a] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E4E6EB] dark:border-[#2a2a2a]">
          <h3 className="text-[15px] font-semibold text-[#1C2B33] dark:text-[#ededed]">Planned Spend</h3>
          <p className="text-[13px] text-[#65676B] dark:text-[#888888] mt-0.5">
            Set your weekly ad budget target. Defaults to ₹{DEFAULT_PLANNED_SPEND.toLocaleString("en-IN")} — edit and save per week.
          </p>
        </div>
        {spendLoading ? (
          <div className="p-5 text-[13px] text-[#8A8D91] dark:text-[#616161]">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className="border-b border-[#E4E6EB] dark:border-[#2a2a2a] bg-[#F8F9FA] dark:bg-[#161616]">
                  <th className="text-left px-5 py-3 text-[12px] font-semibold text-[#65676B] dark:text-[#888888] uppercase tracking-wide">Week</th>
                  <th className="text-left px-5 py-3 text-[12px] font-semibold text-[#65676B] dark:text-[#888888] uppercase tracking-wide">Planned Spend (₹)</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {weeks.map((w) => {
                  const entry = spendMap[w];
                  const isCurrent = w === currentMondayStr;
                  if (!entry) return null;
                  return (
                    <tr key={w} className={`border-b border-[#E4E6EB] dark:border-[#2a2a2a] last:border-0 ${isCurrent ? "bg-[#EBF5FF]/40 dark:bg-[#0c1a2e]/20" : "hover:bg-[#F8F9FA] dark:hover:bg-[#1c1c1c]"}`}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] text-[#1C2B33] dark:text-[#ededed]">{fmtWeekLabel(w)}</span>
                          {isCurrent && (
                            <span className="text-[11px] font-medium text-[#1877F2] bg-[#E7F0FD] dark:bg-[#0c1a2e] px-2 py-0.5 rounded-full">
                              Current
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          value={entry.value}
                          onChange={(e) =>
                            setSpendMap((prev) => ({
                              ...prev,
                              [w]: { ...prev[w], value: e.target.value, error: "", saved: false },
                            }))
                          }
                          onKeyDown={(e) => e.key === "Enter" && saveWeek(w)}
                          className="w-40 border border-[#CED0D4] dark:border-[#2a2a2a] rounded-lg px-3 py-1.5 text-[13px] text-[#1C2B33] dark:text-[#ededed] bg-white dark:bg-[#1a1a1a] focus:outline-none focus:border-[#1877F2] focus:ring-1 focus:ring-[#1877F2]"
                        />
                        {entry.error && (
                          <p className="text-[11px] text-[#E41E3F] mt-1">{entry.error}</p>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {entry.saved ? (
                          <span className="text-[12px] text-[#31A24C] font-medium flex items-center gap-1 justify-end">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Saved
                          </span>
                        ) : (
                          <button
                            onClick={() => saveWeek(w)}
                            disabled={entry.saving}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1877F2] text-white text-[12px] font-medium hover:bg-[#166FE5] disabled:opacity-50 transition-colors"
                          >
                            <Save className="h-3 w-3" />
                            {entry.saving ? "Saving..." : "Save"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sync history */}
      <div className="bg-white dark:bg-[#111111] rounded-xl border border-[#E4E6EB] dark:border-[#2a2a2a] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E4E6EB] dark:border-[#2a2a2a]">
          <h3 className="text-[15px] font-semibold text-[#1C2B33] dark:text-[#ededed]">Sync History</h3>
        </div>
        {loading ? (
          <div className="p-5 text-[13px] text-[#8A8D91] dark:text-[#616161]">Loading...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-[13px] text-[#65676B] dark:text-[#888888]">No sync history yet</p>
            <p className="text-[12px] text-[#8A8D91] dark:text-[#616161] mt-1">
              Data will appear after the first GitHub Actions run
            </p>
          </div>
        ) : (
          <div>
            {logs.map((log, i) => (
              <div
                key={log.id}
                className={`flex items-center justify-between px-5 py-3.5 ${i !== logs.length - 1 ? "border-b border-[#E4E6EB] dark:border-[#2a2a2a]" : ""} hover:bg-[#F8F9FA] dark:hover:bg-[#1c1c1c] transition-colors`}
              >
                <div className="flex items-center gap-3">
                  <StatusIcon status={log.status} />
                  <div>
                    <span className="text-[14px] font-medium text-[#1C2B33] dark:text-[#ededed] capitalize">
                      {log.platform} Ads
                    </span>
                    <p className="text-[12px] text-[#8A8D91] dark:text-[#616161]">{formatTime(log.started_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[13px] text-[#65676B] dark:text-[#888888]">{log.records} records</span>
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
