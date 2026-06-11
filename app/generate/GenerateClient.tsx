"use client";

import React, { useState } from "react";
import { apiFetch } from "@/lib/api";
import { Wand2, Download, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

interface GenerateClientProps {
  totalContacts: number;
  contactsWithoutEmails: number;
}

export function GenerateClient({
  totalContacts,
  contactsWithoutEmails,
}: GenerateClientProps) {
  const [maxPatterns, setMaxPatterns] = useState<number>(7);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    generated: number;
    skipped: number;
  } | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const previewPatterns = [
    { rank: 1, label: "first.last", example: "john.smith@company.com", freq: "~42%" },
    { rank: 2, label: "f.last", example: "j.smith@company.com", freq: "~28%" },
    { rank: 3, label: "flast", example: "jsmith@company.com", freq: "~15%" },
    { rank: 4, label: "firstlast", example: "johnsmith@company.com", freq: "~11%" },
    { rank: 5, label: "first", example: "john@company.com", freq: "~9%" },
    { rank: 6, label: "last.first", example: "smith.john@company.com", freq: "~7%" },
    { rank: 7, label: "first.l", example: "john.s@company.com", freq: "~5%" },
    { rank: 8, label: "first_last", example: "john_smith@company.com", freq: "~3%" },
  ];

  const handleGenerate = async () => {
    setLoading(true);
    setResult(null);
    setApiError(null);

    try {
      const res = await apiFetch("/api/emails/generate", {
        method: "POST",
        body: JSON.stringify({ maxPatterns }),
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();

      if (res.ok) {
        setResult({
          success: true,
          generated: data.generated,
          skipped: data.skipped,
        });
      } else {
        setApiError(data.error || "Failed to generate emails.");
      }
    } catch (err) {
      console.error(err);
      setApiError("Internal server error or network issue.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      const secret = process.env.NEXT_PUBLIC_ADMIN_SECRET || "";
      // Trigger a direct browser file download
      window.location.href = `/api/emails/export?all=false&x-admin-secret=${encodeURIComponent(secret)}`;
      // Note: Because window.location.href can't pass custom headers directly under standard GET triggers,
      // we can append it as a query param.
      // Wait, let's update our GET export route to ALSO accept the x-admin-secret from query params to make it robust!
      // This is a crucial edge case: browser download via window.location.href or <a> element cannot set headers.
      // Let's make sure our route handles it! (We will modify checkAuth or the export route to allow query param token check).
    } catch (err) {
      console.error("Download trigger failed", err);
    }
  };

  const handleAlternativeDownload = async () => {
    // Alternatively, let's fetch it authenticated, create a blob and download it to support the auth header fully
    try {
      setLoading(true);
      const res = await apiFetch("/api/emails/export");
      if (!res.ok) {
        const data = await res.json();
        setApiError(data.error || "Failed to export pending CSV.");
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pending_emails_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setApiError("Failed to trigger file download.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">
          Generate Emails
        </h2>
        <p className="mt-2 text-slate-400 text-sm">
          Run B2B pattern combinations for contacts with no generated emails.
        </p>
      </div>

      {/* Overview Counts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 select-none">
        <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl shadow-lg">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Contacts In Database
          </p>
          <p className="mt-2 text-3xl font-extrabold text-white">
            {totalContacts.toLocaleString()}
          </p>
        </div>
        <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl shadow-lg">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Contacts With No Emails
          </p>
          <p className={`mt-2 text-3xl font-extrabold ${contactsWithoutEmails > 0 ? "text-indigo-400" : "text-slate-400"}`}>
            {contactsWithoutEmails.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Settings Area */}
        <div className="lg:col-span-1 bg-slate-900/60 border border-slate-800 p-6 rounded-2xl space-y-6 shadow-xl">
          <h3 className="font-bold text-white text-base">Generation Settings</h3>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Pattern Variant Count
            </label>
            <select
              value={maxPatterns}
              onChange={(e) => setMaxPatterns(parseInt(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 rounded-xl p-3 text-sm text-slate-200 outline-none cursor-pointer"
            >
              <option value={5}>5 Patterns (Startups only)</option>
              <option value={6}>6 Patterns</option>
              <option value={7}>7 Patterns (Standard B2B)</option>
              <option value={8}>8 Patterns (Aggressive Coverage)</option>
            </select>
          </div>

          {apiError && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{apiError}</span>
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={loading || totalContacts === 0}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-indigo-600 hover:bg-indigo-500 active:scale-98 disabled:opacity-40 disabled:hover:bg-indigo-600 disabled:active:scale-100 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer text-sm"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                Run Generation Pipeline
              </>
            )}
          </button>

          {result && (
            <div className="space-y-4 pt-4 border-t border-slate-800 animate-fadeIn">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                <CheckCircle className="w-4 h-4" />
                Completed Successfully
              </div>
              <div className="grid grid-cols-2 gap-3 font-semibold text-xs">
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-805">
                  <span className="text-slate-400 block text-[10px] uppercase">Generated</span>
                  <span className="text-emerald-400 text-lg block mt-0.5">{result.generated}</span>
                </div>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-805">
                  <span className="text-slate-400 block text-[10px] uppercase">Deduplicated</span>
                  <span className="text-slate-300 text-lg block mt-0.5">{result.skipped}</span>
                </div>
              </div>

              <button
                onClick={handleAlternativeDownload}
                className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition-all cursor-pointer text-sm"
              >
                <Download className="w-4 h-4" />
                Download CSV for Apify
              </button>
            </div>
          )}
        </div>

        {/* Live Preview Area */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-bold text-white text-base tracking-tight">
            Pattern List Preview
          </h3>
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/40 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-3.5 px-6">Rank</th>
                  <th className="py-3.5 px-6">Pattern Label</th>
                  <th className="py-3.5 px-6">Example Candidate</th>
                  <th className="py-3.5 px-6 text-right">Coverage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 text-xs font-medium">
                {previewPatterns.slice(0, maxPatterns).map((p) => (
                  <tr
                    key={p.rank}
                    className="hover:bg-slate-800/10 text-slate-300 transition-colors duration-150"
                  >
                    <td className="py-3 px-6 text-slate-500">#{p.rank}</td>
                    <td className="py-3 px-6 font-mono text-[11px] text-slate-400">
                      {p.label}
                    </td>
                    <td className="py-3 px-6 font-mono text-[11px] text-indigo-400 font-semibold select-all">
                      {p.example}
                    </td>
                    <td className="py-3 px-6 text-right text-slate-400 font-bold">
                      {p.freq}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
