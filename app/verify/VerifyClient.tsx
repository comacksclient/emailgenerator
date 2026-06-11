"use client";

import React, { useState, useRef, DragEvent } from "react";
import { apiFetch } from "@/lib/api";
import {
  Download,
  UploadCloud,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Clipboard,
  ExternalLink,
  Info,
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

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    setExportLoading(true);
    setApiError(null);
    try {
      const res = await apiFetch("/api/emails/export");
      if (!res.ok) {
        const data = await res.json();
        setApiError(data.error || "No pending emails found to export.");
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
        {/* Section A: Export */}
        <div className="bg-slate-900/60 border border-slate-800 p-8 rounded-2xl flex flex-col justify-between shadow-xl space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider">
              <span className="bg-indigo-600/20 px-2.5 py-1 rounded-full">Section A</span>
              <span>Export for Apify</span>
            </div>
            <h3 className="text-xl font-bold text-white tracking-tight">
              Download Pending Emails
            </h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Export all candidate emails currently set to <span className="text-amber-400 font-semibold">PENDING</span>.
              Take this exported CSV to your Apify verification actor.
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

            <div className="bg-slate-900/30 p-4 rounded-xl text-xs text-slate-400 space-y-2 border border-slate-850">
              <p className="font-semibold text-slate-300">Apify verification instructions:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Download the pending emails CSV using the button below.</li>
                <li>Go to Apify and run your preferred email validation actor.</li>
                <li>Upload this CSV to the actor to run validation.</li>
                <li>Download the result file (needs columns: <span className="font-mono text-indigo-400">email</span> and <span className="font-mono text-indigo-400">status</span>).</li>
              </ol>
            </div>
          </div>

          <button
            onClick={handleExport}
            disabled={exportLoading || pendingCount === 0}
            className="w-full flex items-center justify-center gap-2 py-4 bg-indigo-600 hover:bg-indigo-500 active:scale-98 disabled:opacity-40 disabled:hover:bg-indigo-600 disabled:active:scale-100 text-white font-bold rounded-2xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer text-sm"
          >
            {exportLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Preparing Export...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Download Pending Emails CSV
              </>
            )}
          </button>
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
              Import the result CSV file from Apify. The system will permanently save VALID emails and delete INVALID ones.
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
                  Or Paste Results
                </label>
                <textarea
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder="email,status&#10;john.smith@co.com,valid&#10;j.smith@co.com,invalid"
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
                  <span className="text-slate-400 block text-[9px] uppercase">Hard Deleted</span>
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
