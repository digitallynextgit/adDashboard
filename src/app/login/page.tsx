"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, AlertCircle, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    setLoading(false);

    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      setError("Incorrect password. Try again.");
      setPassword("");
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-meta-sidebar dark:bg-[#0a0a0a] px-4 py-10">
      <div className="w-full max-w-95">

        {/* Hero */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-meta-blue flex items-center justify-center mb-4 shadow-sm">
            <BarChart3 className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-[20px] font-bold text-meta-dark dark:text-[#ededed] tracking-tight">
            Welcome back
          </h1>
          <p className="text-[13px] text-[#65676B] dark:text-[#888888] mt-1">
            Sign in to access your ads dashboard
          </p>
        </div>

        {/* Form card */}
        <div className="bg-white dark:bg-[#111111] rounded-xl border border-[#E4E6EB] dark:border-[#2a2a2a] p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="password"
                className="block text-[13px] font-medium text-meta-dark dark:text-[#ededed] mb-1.5"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                autoFocus
                disabled={loading}
                className="w-full px-3 py-2.5 rounded-lg border border-[#CED0D4] dark:border-[#2a2a2a] bg-white dark:bg-[#0a0a0a] text-[13px] text-meta-dark dark:text-[#ededed] placeholder-[#8A8D91] dark:placeholder-[#616161] focus:outline-none focus:ring-2 focus:ring-meta-blue focus:border-transparent transition-shadow disabled:opacity-50"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-[#FEF2F2] dark:bg-[#7F1D1D]/15 border border-[#FECACA] dark:border-[#7F1D1D]/40">
                <AlertCircle className="h-4 w-4 text-meta-red shrink-0" />
                <p className="text-[12px] font-medium text-meta-red dark:text-[#F87171]">
                  {error}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-meta-blue hover:bg-meta-blue-hover text-white text-[13px] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>

        {/* Footer brand */}
        <div className="flex items-center justify-center gap-1.5 mt-6">
          <div className="w-1.5 h-1.5 rounded-full bg-meta-green" />
          <span className="text-[11px] text-[#65676B] dark:text-[#888888]">
            AdAuto · Secure access
          </span>
        </div>
      </div>
    </div>
  );
}
