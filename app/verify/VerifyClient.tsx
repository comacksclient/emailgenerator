"use client";

import React, { useState, useRef, DragEvent, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import {
  UploadCloud,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Clipboard,
  ExternalLink,
  Info,
  Copy,
  Check,
  Download,
} from "lucide-react";

interface VerifyClientProps {
  initialPendingCount: number;
}

export function VerifyClient({ initialPendingCount }: VerifyClientProps) {
  const [pendingCount, setPendingCount] = useState(initialPendingCount);
  const [csvText, setCsvText] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    markedValid: number;
    deleted: number;
    markedUnknown: number;
    skipped: number;
  } | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [selectedRank, setSelectedRank] = useState<string>("all");
  const [emailsList, setEmailsList] = useState<string[]>([]);
  const [emailsLoading, setEmailsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchEmailsForRank = async (rank: string) => {
    setEmailsLoading(true);
    setApiError(null);
    try {
      const queryParams = new URLSearchParams();
      if (rank !== "all") {
        queryParams.set("rank", rank);
      }
      queryParams.set("json", "true");
      const res = await apiFetch(`/api/emails/export?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setEmailsList(data.emails || []);
      } else {
        setEmailsList([]);
        const data = await res.json();
        setApiError(data.error || "No pending emails found to export.");
      }
    } catch (err) {
      console.error(err);
      setApiError("Failed to fetch pending emails.");
      setEmailsList([]);
    } finally {
      setEmailsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmailsForRank(selectedRank);
  }, [selectedRank, pendingCount]);

  const handleCopy = async () => {
    if (emailsList.length === 0) return;
    try {
      await navigator.clipboard.writeText(emailsList.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
      setApiError("Failed to copy to clipboard.");
    }
  };

  const handleDownloadCSV = async () => {
    setExportLoading(true);
    setApiError(null);
    try {
      const queryParams = new URLSearchParams();
      if (selectedRank !== "all") {
        queryParams.set("rank", selectedRank);
      }
      const res = await apiFetch(`/api/emails/export?${queryParams.toString()}`);
      if (!res.ok) {
        const data = await res.json();
        setApiError(data.error || "No pending emails found to export.");
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const rankSuffix = selectedRank !== "all" ? `_rank_${selectedRank}` : "";
      a.download = `pending_emails${rankSuffix}_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setApiError("Failed to download pending emails.");
    } finally {
      setExportLoading(false);
    }
  };

  const handleFile = (file: File) => {
    if (!file.name.endsWith(".csv")) {
      setApiError("Only .csv files are supported.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setCsvText(text);
      setApiError(null);
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvText.trim()) {
      setApiError("Please paste Apify results or upload a file first.");
      return;
    }

    setLoading(true);
    setResult(null);
    setApiError(null);

    try {
      const res = await apiFetch("/api/verify/import", {
        method: "POST",
        body: JSON.stringify({ csv: csvText }),
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();

      if (res.ok) {
        setResult({
          success: true,
          markedValid: data.markedValid,
          deleted: data.deleted,
          markedUnknown: data.markedUnknown,
          skipped: data.skipped,
        });
        // Reset count of pending
        const countRes = await apiFetch("/api/database?status=pending");
        if (countRes.ok) {
          const countData = await countRes.json();
          setPendingCount(countData.total || 0);
        }
        setCsvText("");
      } else {
        setApiError(data.error || "Failed to process results file.");
      }
    } catch (err) {
      console.error(err);
      setApiError("Internal server error or network issue.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10">
      <div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">
          Verify via Apify
        </h2>
        <p className="mt-2 text-slate-400 text-sm">
          Export pending emails, verify them inside Apify manually, then re-import the results.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Section A: Copy */}
        <div className="bg-slate-900/60 border border-slate-800 p-8 rounded-2xl flex flex-col justify-between shadow-xl space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider">
              <span className="bg-indigo-600/20 px-2.5 py-1 rounded-full">Section A</span>
              <span>Copy for Apify</span>
            </div>
            <h3 className="text-xl font-bold text-white tracking-tight">
              Copy Pending Emails
            </h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Copy candidate emails currently set to <span className="text-amber-400 font-semibold">PENDING</span>.
              Pasting this list directly into your Apify verification actor is faster than managing files.
            </p>

            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-850 flex items-center justify-between select-none">
              <div>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  Pending Candidate Emails
                </p>
                <p className={`text-3xl font-extrabold mt-1.5 ${pendingCount > 0 ? "text-amber-400" : "text-slate-500"}`}>
                  {pendingCount.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/10 text-amber-400">
                <Info className="w-6 h-6" />
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Select Pattern Rank to Verify (Cost-Optimization)
              </label>
              <select
                value={selectedRank}
                onChange={(e) => setSelectedRank(e.target.value)}
                className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 rounded-xl p-3 text-sm text-slate-200 outline-none cursor-pointer"
              >
                <option value="all">All Pending Patterns (Verify All)</option>
                <option value="1">Rank 1 only (first.last — ~42% coverage)</option>
                <option value="2">Rank 2 only (f.last — ~28% coverage)</option>
                <option value="3">Rank 3 only (flast — ~15% coverage)</option>
                <option value="4">Rank 4 only (firstlast — ~11% coverage)</option>
                <option value="5">Rank 5 only (first — ~9% coverage)</option>
                <option value="6">Rank 6 only (last.first — ~7% coverage)</option>
                <option value="7">Rank 7 only (first.l — ~5% coverage)</option>
                <option value="8">Rank 8 only (first_last — ~3% coverage)</option>
              </select>
            </div>

            {/* Preview Box */}
            <div className="space-y-2 pt-2">
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                Pending Emails Preview ({emailsList.length})
              </label>
              {emailsLoading ? (
                <div className="h-32 bg-slate-950 rounded-xl border border-slate-850 flex items-center justify-center text-slate-500 text-xs">
                  <Loader2 className="w-5 h-5 animate-spin mr-2 text-indigo-400" />
                  Loading candidate list...
                </div>
              ) : emailsList.length === 0 ? (
                <div className="h-32 bg-slate-950 rounded-xl border border-slate-850 flex items-center justify-center text-slate-500 text-xs font-medium">
                  No pending emails for this pattern rank.
                </div>
              ) : (
                <div className="relative group">
                  <textarea
                    readOnly
                    value={emailsList.join("\n")}
                    rows={5}
                    className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 rounded-xl p-3 font-mono text-xs text-indigo-300 placeholder-slate-700 outline-none resize-none cursor-text select-all"
                  />
                  <div className="absolute right-3 top-3 opacity-60 group-hover:opacity-100 transition-opacity">
                    <span className="text-[9px] bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded text-slate-500 font-semibold select-none">
                      CTRL+A to select
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-slate-900/30 p-4 rounded-xl text-xs text-slate-400 space-y-2 border border-slate-850">
              <p className="font-semibold text-slate-300">Apify verification instructions:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Select the target pattern rank above.</li>
                <li>Copy the pending emails or download the CSV using the buttons below.</li>
                <li>Go to Apify, paste the copied list or upload the CSV, and run the verifier.</li>
                <li>Import the result CSV in Section B below.</li>
              </ol>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleCopy}
              disabled={emailsLoading || emailsList.length === 0}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 font-bold rounded-xl shadow-lg transition-all cursor-pointer text-sm ${
                copied
                  ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30 text-white"
                  : "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30 text-white active:scale-98 disabled:opacity-40 disabled:hover:bg-indigo-600 disabled:active:scale-100"
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy Emails
                </>
              )}
            </button>

            <button
              onClick={handleDownloadCSV}
              disabled={emailsLoading || exportLoading || emailsList.length === 0}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-slate-805 hover:bg-slate-750 active:scale-98 disabled:opacity-40 disabled:hover:bg-slate-805 border border-slate-800 text-white font-bold rounded-xl shadow-lg transition-all cursor-pointer text-sm"
            >
              {exportLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Download CSV
                </>
              )}
            </button>
          </div>
        </div>

        {/* Section B: Import */}
        <div className="bg-slate-900/60 border border-slate-800 p-8 rounded-2xl flex flex-col justify-between shadow-xl space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
              <span className="bg-emerald-600/20 px-2.5 py-1 rounded-full">Section B</span>
              <span>Import Results</span>
            </div>
            <h3 className="text-xl font-bold text-white tracking-tight">
              Upload Apify Result CSV
            </h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Import the result CSV file from Apify. The system will save VALID and INVALID email results in your database.
            </p>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Drag & Drop */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={triggerFileSelect}
                className={`border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 ${
                  isDragOver
                    ? "border-emerald-500 bg-emerald-500/10 scale-[1.01]"
                    : "border-slate-850 hover:border-slate-800 bg-slate-950/40 hover:bg-slate-950/80"
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".csv"
                  className="hidden"
                />
                <UploadCloud className="w-8 h-8 text-emerald-400 mb-2" />
                <p className="text-xs font-semibold text-white">
                  Drop your Apify result file here
                </p>
                <p className="text-[10px] text-slate-500 mt-1">
                  or click to select file
                </p>
              </div>

              {/* Textarea */}
              <div className="flex flex-col">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1.5">
                  <Clipboard className="w-3 h-3" />
                  Or Paste Result
                </label>
                <textarea
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder="email,result&#10;john.smith@co.com,valid&#10;j.smith@co.com,invalid"
                  rows={4}
                  className="w-full bg-slate-950 border border-slate-855 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 rounded-xl p-3 font-mono text-[10px] text-slate-300 placeholder-slate-700 outline-none transition-all"
                />
              </div>

              {apiError && (
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-semibold">
                  {apiError}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !csvText.trim()}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-emerald-600 hover:bg-emerald-500 active:scale-98 disabled:opacity-40 disabled:hover:bg-emerald-600 disabled:active:scale-100 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition-all cursor-pointer text-sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing Results...
                  </>
                ) : (
                  "Import Verification Results"
                )}
              </button>
            </form>
          </div>

          {result && (
            <div className="bg-slate-950 border border-slate-850 rounded-xl p-5 space-y-4 animate-fadeIn">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                <CheckCircle className="w-4 h-4" />
                Results Imported Successfully
              </div>

              <div className="grid grid-cols-2 gap-3 text-[11px] font-semibold">
                <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[9px] uppercase">Marked Valid</span>
                  <span className="text-emerald-400 text-base block mt-0.5">{result.markedValid}</span>
                </div>
                <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[9px] uppercase">Marked Invalid</span>
                  <span className="text-rose-400 text-base block mt-0.5">{result.deleted}</span>
                </div>
                <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[9px] uppercase">Unknown (Pending)</span>
                  <span className="text-amber-400 text-base block mt-0.5">{result.markedUnknown}</span>
                </div>
                <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[9px] uppercase">Skipped (Firm)</span>
                  <span className="text-slate-300 text-base block mt-0.5">{result.skipped}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
