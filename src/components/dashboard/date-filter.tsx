"use client";

import { Calendar } from "lucide-react";

export type DateRange = "7d" | "14d" | "30d" | "this_month" | "last_month";

interface DateFilterProps {
  value: DateRange;
  onChange: (value: DateRange) => void;
}

const options: { value: DateRange; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "14d", label: "Last 14 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
];

export function getDateRange(range: DateRange): { start: string; end: string } {
  const now = new Date();
  const end = now.toISOString().split("T")[0];
  let start: Date;

  switch (range) {
    case "7d":
      start = new Date(now);
      start.setDate(start.getDate() - 7);
      break;
    case "14d":
      start = new Date(now);
      start.setDate(start.getDate() - 14);
      break;
    case "30d":
      start = new Date(now);
      start.setDate(start.getDate() - 30);
      break;
    case "this_month":
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "last_month":
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      return {
        start: start.toISOString().split("T")[0],
        end: endOfLastMonth.toISOString().split("T")[0],
      };
  }

  return { start: start.toISOString().split("T")[0], end };
}

export function getPreviousPeriod(range: DateRange): {
  start: string;
  end: string;
} {
  const current = getDateRange(range);
  const startDate = new Date(current.start);
  const endDate = new Date(current.end);
  const diff = endDate.getTime() - startDate.getTime();
  const prevEnd = new Date(startDate.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - diff);

  return {
    start: prevStart.toISOString().split("T")[0],
    end: prevEnd.toISOString().split("T")[0],
  };
}

export function DateFilter({ value, onChange }: DateFilterProps) {
  return (
    <div className="relative inline-flex items-center">
      <Calendar className="absolute left-3 h-4 w-4 text-[#65676B] pointer-events-none" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as DateRange)}
        className="appearance-none bg-white border border-[#CED0D4] rounded-lg pl-9 pr-8 py-2 text-[14px] text-[#1C2B33] font-medium cursor-pointer hover:border-[#1877F2] focus:outline-none focus:border-[#1877F2] focus:ring-1 focus:ring-[#1877F2] transition-colors"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <svg
        className="absolute right-2.5 h-4 w-4 text-[#65676B] pointer-events-none"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 9l-7 7-7-7"
        />
      </svg>
    </div>
  );
}
