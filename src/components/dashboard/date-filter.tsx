"use client";

import { useState, useRef, useEffect } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

// ─── date helpers (local time, not UTC) ──────────────────────────────────────

function fmt(d: Date): string {
  const y  = d.getFullYear();
  const m  = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function parseLocal(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function addDays(s: string, n: number): string {
  const d = parseLocal(s);
  d.setDate(d.getDate() + n);
  return fmt(d);
}

function todayStr(): string {
  return fmt(new Date());
}

function fmtShort(s: string): string {
  return parseLocal(s).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

// ─── presets ──────────────────────────────────────────────────────────────────

export type DateRange = "7d" | "14d" | "30d" | "this_month" | "last_month";

const PRESETS: { value: DateRange; label: string }[] = [
  { value: "7d",         label: "Last 7 days"  },
  { value: "14d",        label: "Last 14 days" },
  { value: "30d",        label: "Last 30 days" },
  { value: "this_month", label: "This Month"   },
  { value: "last_month", label: "Last Month"   },
];

export function getDateRange(range: DateRange): { start: string; end: string } {
  const now = new Date();
  const end = todayStr();
  switch (range) {
    case "7d":  return { start: addDays(end, -7),  end };
    case "14d": return { start: addDays(end, -14), end };
    case "30d": return { start: addDays(end, -30), end };
    case "this_month":
      return { start: fmt(new Date(now.getFullYear(), now.getMonth(), 1)), end };
    case "last_month": {
      const start = fmt(new Date(now.getFullYear(), now.getMonth() - 1, 1));
      const endDate = fmt(new Date(now.getFullYear(), now.getMonth(), 0));
      return { start, end: endDate };
    }
  }
}

export function getPreviousPeriod(
  start: string,
  end: string
): { start: string; end: string } {
  const startMs = parseLocal(start).getTime();
  const endMs   = parseLocal(end).getTime();
  const diff    = endMs - startMs;
  const prevEnd   = new Date(startMs - 86_400_000); // one day before start
  const prevStart = new Date(prevEnd.getTime() - diff);
  return { start: fmt(prevStart), end: fmt(prevEnd) };
}

function matchPreset(start: string, end: string): DateRange | null {
  for (const p of PRESETS) {
    const r = getDateRange(p.value);
    if (r.start === start && r.end === end) return p.value;
  }
  return null;
}

// ─── CalendarPicker ───────────────────────────────────────────────────────────

const DAY_LABELS  = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

interface CalendarPickerProps {
  start: string;
  end:   string;
  onApply: (start: string, end: string) => void;
}

function CalendarPicker({ start, end, onApply }: CalendarPickerProps) {
  const initDate = parseLocal(end);
  const [viewYear,  setViewYear]  = useState(initDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initDate.getMonth());

  const [selStart, setSelStart] = useState<string | null>(start);
  const [selEnd,   setSelEnd]   = useState<string | null>(end);
  const [hover,    setHover]    = useState<string | null>(null);

  const today = todayStr();

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  function handleClick(day: string) {
    if (!selStart || selEnd) {
      setSelStart(day);
      setSelEnd(null);
    } else {
      const lo = day < selStart ? day : selStart;
      const hi = day < selStart ? selStart : day;
      setSelStart(lo);
      setSelEnd(hi);
      onApply(lo, hi);
    }
  }

  const effEnd = selEnd ?? hover;
  const rangeA = selStart && effEnd ? (selStart <= effEnd ? selStart : effEnd) : selStart;
  const rangeB = selStart && effEnd ? (selStart <= effEnd ? effEnd : selStart) : selStart;

  const firstDow    = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (string | null)[] = Array(firstDow).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(fmt(new Date(viewYear, viewMonth, d)));
  }
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div
      className="absolute right-0 top-[calc(100%+8px)] z-50 bg-white dark:bg-[#111111] rounded-xl border border-[#E4E6EB] dark:border-[#2a2a2a] shadow-lg p-4 w-[288px] max-w-[calc(100vw-2rem)]"
      onMouseLeave={() => setHover(null)}
    >
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={prevMonth}
          className="p-1.5 rounded-lg hover:bg-[#F0F2F5] dark:hover:bg-[#1c1c1c] transition-colors"
        >
          <ChevronLeft className="h-4 w-4 text-[#65676B] dark:text-[#888888]" />
        </button>
        <span className="text-[14px] font-semibold text-[#1C2B33] dark:text-[#ededed]">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>
        <button
          onClick={nextMonth}
          className="p-1.5 rounded-lg hover:bg-[#F0F2F5] dark:hover:bg-[#1c1c1c] transition-colors"
        >
          <ChevronRight className="h-4 w-4 text-[#65676B] dark:text-[#888888]" />
        </button>
      </div>

      {/* Day-of-week labels */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map(d => (
          <div key={d} className="text-center text-[11px] font-medium text-[#8A8D91] dark:text-[#616161] py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} className="h-8" />;

          const isRangeA  = day === rangeA;
          const isRangeB  = day === rangeB && rangeB !== rangeA;
          const isSingle  = day === rangeA && rangeA === rangeB;
          const inRange   = !!(rangeA && rangeB && day > rangeA && day < rangeB);
          const isToday   = day === today;
          const isFuture  = day > today;
          const isSelected = isRangeA || isRangeB || isSingle;

          return (
            <div
              key={day}
              className={[
                "relative flex items-center justify-center h-8",
                inRange              ? "bg-[#E7F3FF] dark:bg-[#0c1a2e]"                   : "",
                isRangeA && !isSingle ? "rounded-l-full bg-[#E7F3FF] dark:bg-[#0c1a2e]"  : "",
                isRangeB             ? "rounded-r-full bg-[#E7F3FF] dark:bg-[#0c1a2e]"   : "",
              ].join(" ")}
            >
              <button
                disabled={isFuture}
                onClick={() => handleClick(day)}
                onMouseEnter={() => { if (!selEnd) setHover(day); }}
                className={[
                  "w-8 h-8 text-[13px] rounded-full transition-colors z-10",
                  isSelected
                    ? "bg-[#1877F2] text-white font-semibold"
                    : inRange
                      ? "text-[#1C2B33] dark:text-[#ededed] hover:bg-[#CBE0FF] dark:hover:bg-[#0f2040]"
                      : isFuture
                        ? "text-[#CED0D4] dark:text-[#444444] cursor-not-allowed"
                        : "text-[#1C2B33] dark:text-[#ededed] hover:bg-[#F0F2F5] dark:hover:bg-[#1c1c1c]",
                  isToday && !isSelected
                    ? "font-bold !text-[#1877F2]"
                    : "",
                ].join(" ")}
              >
                {parseLocal(day).getDate()}
              </button>
            </div>
          );
        })}
      </div>

      {/* Footer hint */}
      <div className="mt-3 pt-3 border-t border-[#E4E6EB] dark:border-[#2a2a2a] text-[12px] text-[#65676B] dark:text-[#888888] text-center min-h-[20px]">
        {selStart && selEnd
          ? `${fmtShort(selStart)} – ${fmtShort(selEnd)}`
          : selStart
            ? "Now select an end date"
            : "Select a start date"}
      </div>
    </div>
  );
}

// ─── DateFilter ───────────────────────────────────────────────────────────────

interface DateFilterProps {
  start:    string;
  end:      string;
  onChange: (start: string, end: string) => void;
}

export function DateFilter({ start, end, onChange }: DateFilterProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const preset  = matchPreset(start, end);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative flex items-center gap-1.5" ref={wrapRef}>
      {/* Preset dropdown */}
      <div className="relative inline-flex items-center">
        <select
          value={preset ?? "__custom__"}
          onChange={(e) => {
            const r = getDateRange(e.target.value as DateRange);
            onChange(r.start, r.end);
            setOpen(false);
          }}
          className="appearance-none bg-white dark:bg-[#111111] border border-[#CED0D4] dark:border-[#2a2a2a] rounded-lg pl-3 pr-8 py-2 text-[14px] text-[#1C2B33] dark:text-[#ededed] font-medium cursor-pointer hover:border-[#1877F2] focus:outline-none focus:border-[#1877F2] focus:ring-1 focus:ring-[#1877F2] transition-colors"
        >
          {PRESETS.map(p => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
          {!preset && (
            <option value="__custom__" disabled>
              {fmtShort(start)} – {fmtShort(end)}
            </option>
          )}
        </select>
        <svg
          className="absolute right-2.5 h-4 w-4 text-[#65676B] dark:text-[#888888] pointer-events-none"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Calendar toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        title="Pick custom date range"
        className={`p-2 rounded-lg border transition-colors ${
          open || !preset
            ? "border-[#1877F2] bg-[#E7F3FF] dark:bg-[#0c1a2e] text-[#1877F2]"
            : "border-[#CED0D4] dark:border-[#2a2a2a] bg-white dark:bg-[#111111] text-[#65676B] dark:text-[#888888] hover:bg-[#F0F2F5] dark:hover:bg-[#1c1c1c]"
        }`}
      >
        <Calendar className="h-4 w-4" />
      </button>

      {/* Calendar popover */}
      {open && (
        <CalendarPicker
          start={start}
          end={end}
          onApply={(s, e) => {
            onChange(s, e);
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}
