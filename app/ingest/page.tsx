"use client";

import React, { useState, useRef, DragEvent } from "react";
import Link from "next/link";
import { UploadCloud, ArrowRight, CheckCircle, AlertTriangle, Loader2, Clipboard } from "lucide-react";
import { apiFetch } from "@/lib/api";

export default function IngestPage() {
  const [csvText, setCsvText] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    inserted: number;
    skipped: number;
    errors: string[];
  } | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse file content
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
      setApiError("Please paste CSV data or upload a file first.");
      return;
    }

    setLoading(true);
    setResult(null);
    setApiError(null);

    try {
      const res = await apiFetch("/api/contacts", {
        method: "POST",
        body: JSON.stringify({ csv: csvText }),
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();

      if (res.ok) {
        setResult({
          success: true,
          inserted: data.inserted,
          skipped: data.skipped,
          errors: data.errors || [],
        });
      } else {
        setApiError(data.error || "Failed to parse CSV file.");
        if (data.errors) {
          setResult({
            success: false,
            inserted: 0,
            skipped: 0,
            errors: data.errors,
          });
        }
      }
    } catch (err) {
      console.error(err);
      setApiError("Internal server error or network issue.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">
          Ingest Contacts
        </h2>
        <p className="mt-2 text-slate-400 text-sm">
          Import a list of contacts to generate standard B2B email combinations.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Input area */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Drag & Drop Area */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={triggerFileSelect}
              className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 ${
                isDragOver
                  ? "border-indigo-500 bg-indigo-500/10 scale-[1.01]"
                  : "border-slate-800 hover:border-slate-700 bg-slate-900/30 hover:bg-slate-900/50"
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".csv"
                className="hidden"
              />
              <UploadCloud className="w-10 h-10 text-indigo-400 mb-3 animate-pulse" />
              <p className="text-sm font-semibold text-white">
                Drag and drop your .csv file here
              </p>
              <p className="text-xs text-slate-500 mt-1.5">
                or click to browse local files
              </p>
            </div>

            {/* Pasting Box */}
            <div className="flex flex-col">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <Clipboard className="w-3.5 h-3.5" />
                Or Paste CSV Data Directly
              </label>
              <textarea
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="first_name,last_name,company,domain&#10;John,Smith,Acme Corp,acme.com&#10;Jane,Doe,Beta Co,betaco.io"
                rows={8}
                className="w-full bg-slate-900/50 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 rounded-2xl p-4 font-mono text-xs text-slate-300 placeholder-slate-600 outline-none transition-all"
              />
            </div>

            {apiError && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-semibold">
                {apiError}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !csvText.trim()}
              className="w-full flex items-center justify-center gap-2 py-4 bg-indigo-600 hover:bg-indigo-500 active:scale-98 disabled:opacity-40 disabled:hover:bg-indigo-600 disabled:active:scale-100 text-white font-bold rounded-2xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Uploading and Parsing CSV...
                </>
              ) : (
                "Parse and Save Contacts"
              )}
            </button>
          </form>

          {/* Results Summary Box */}
          {result && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-md space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Ingestion Completed</h3>
                  <p className="text-xs text-slate-500">
                    Contacts processing details are displayed below.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Contacts Saved
                  </p>
                  <p className="text-2xl font-extrabold text-emerald-400 mt-1">
                    {result.inserted}
                  </p>
                </div>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Rows Skipped
                  </p>
                  <p className="text-2xl font-extrabold text-amber-400 mt-1">
                    {result.skipped}
                  </p>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-rose-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Row Skipped Notices ({result.errors.length})
                  </p>
                  <div className="max-h-40 overflow-y-auto bg-slate-950/80 border border-slate-800/60 rounded-xl p-3 font-mono text-[10px] text-slate-400 space-y-1 divide-y divide-slate-800/40">
                    {result.errors.map((err, i) => (
                      <div key={i} className="pt-1.5 first:pt-0">
                        {err}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.inserted > 0 && (
                <div className="pt-4 flex justify-end">
                  <Link
                    href="/generate"
                    className="inline-flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition-all text-sm"
                  >
                    Generate Emails
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar Info/Instruction */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div>
            <h3 className="font-bold text-white text-sm">CSV Specifications</h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Standard list file structures required. Column headers are case-insensitive. Space characters in headers will be parsed using underscores.
            </p>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Expected Headers
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-300">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                <span className="font-mono text-indigo-400">first_name</span> or <span className="font-mono text-indigo-400">firstname</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                <span className="font-mono text-indigo-400">last_name</span> or <span className="font-mono text-indigo-400">lastname</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                <span className="font-mono text-indigo-400">company</span> (optional)
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                <span className="font-mono text-indigo-400">domain</span> or <span className="font-mono text-indigo-400">company_domain</span>
              </li>
            </ul>
          </div>

          <div className="pt-4 border-t border-slate-800">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
              Sample Data Block
            </h4>
            <pre className="bg-slate-950 p-3.5 rounded-xl border border-slate-850 font-mono text-[10px] text-slate-400 leading-normal overflow-x-auto select-all">
              first_name,last_name,domain,company{"\n"}
              Alexander,Hamilton,treasury.gov,US Treasury{"\n"}
              Thomas,Jefferson,state.gov,State Dept
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
