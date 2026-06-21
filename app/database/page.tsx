"use client";

import React, { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { Email, VerifyStatus } from "@/types";
import { DataTable } from "@/components/DataTable";
import { Search, Download, Loader2, Trash2 } from "lucide-react";

export default function DatabasePage() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  // Debounce search input by 350ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to page 1 on new search
    }, 350);

    return () => clearTimeout(timer);
  }, [search]);

  // Fetch emails on filters and page changes
  const fetchEmails = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        status: statusFilter,
        search: debouncedSearch,
      });

      const res = await apiFetch(`/api/database?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setEmails(data.emails || []);
        setTotalCount(data.total || 0);
        setTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      console.error("Failed to fetch database emails", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmails();
  }, [page, statusFilter, debouncedSearch]);

  const handleDeleteAction = async (action: string, confirmMsg: string) => {
    if (!window.confirm(confirmMsg)) return;

    setDeleteLoading(action);
    try {
      const res = await apiFetch(`/api/database?action=${action}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || "Operation completed successfully.");
        // Reset list view parameters
        setPage(1);
        setStatusFilter("all");
        setSearch("");
        setDebouncedSearch("");
        await fetchEmails();
      } else {
        alert(data.error || "Failed to execute delete action.");
      }
    } catch (err) {
      console.error(err);
      alert("Error occurred deleting records.");
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleExportAll = async () => {
    setExportLoading(true);
    try {
      const res = await apiFetch("/api/emails/export?all=true");
      if (!res.ok) {
        alert("Failed to export database emails.");
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `valid_emails_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Error occurred downloading database.");
    } finally {
      setExportLoading(false);
    }
  };

  const statusOptions = [
    { label: "All Candidates", value: "all" },
    { label: "Valid", value: "valid" },
    { label: "Catch-all", value: "catch_all" },
    { label: "Pending", value: "pending" },
    { label: "Unknown", value: "unknown" },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Title & Action Bar */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">
            Email Database
          </h2>
          <p className="mt-2 text-slate-400 text-sm">
            Search, filter, and review all email candidates in the system.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Danger zone actions */}
          <button
            onClick={() =>
              handleDeleteAction(
                "delete_pending",
                "Are you sure you want to delete ALL pending email candidates? This action cannot be undone."
              )
            }
            disabled={deleteLoading !== null || loading}
            className="px-4 py-2.5 border border-red-500/20 hover:border-red-500/40 bg-red-950/10 hover:bg-red-950/30 text-red-400 font-bold rounded-xl text-xs transition-all active:scale-95 disabled:opacity-40 flex items-center gap-1.5 cursor-pointer"
          >
            {deleteLoading === "delete_pending" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
            Clear Pending
          </button>

          <button
            onClick={() =>
              handleDeleteAction(
                "delete_invalid",
                "Are you sure you want to delete ALL invalid email candidates? This action cannot be undone."
              )
            }
            disabled={deleteLoading !== null || loading}
            className="px-4 py-2.5 border border-red-500/20 hover:border-red-500/40 bg-red-950/10 hover:bg-red-950/30 text-red-400 font-bold rounded-xl text-xs transition-all active:scale-95 disabled:opacity-40 flex items-center gap-1.5 cursor-pointer"
          >
            {deleteLoading === "delete_invalid" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
            Clear Invalid
          </button>

          <button
            onClick={() =>
              handleDeleteAction(
                "clear_all",
                "WARNING: This will delete ALL contacts and ALL email candidates, resetting the database completely. Are you sure you want to proceed?"
              )
            }
            disabled={deleteLoading !== null || loading}
            className="px-4 py-2.5 border border-red-650/35 hover:border-red-650/60 bg-red-650/10 hover:bg-red-650/20 text-red-400 font-extrabold rounded-xl text-xs transition-all active:scale-95 disabled:opacity-40 flex items-center gap-1.5 cursor-pointer"
          >
            {deleteLoading === "clear_all" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
            Reset DB
          </button>

          {/* Export button */}
          <button
            onClick={handleExportAll}
            disabled={exportLoading || deleteLoading !== null}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-slate-900 border border-slate-805 hover:bg-slate-800 active:scale-95 text-slate-200 font-bold rounded-xl shadow-xl transition-all text-sm cursor-pointer disabled:opacity-50"
          >
            {exportLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Export Valid Emails CSV
              </>
            )}
          </button>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
        {/* Pills */}
        <div className="flex flex-wrap gap-2 select-none">
          {statusOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                setStatusFilter(opt.value);
                setPage(1);
              }}
              className={`px-4 py-2.5 text-xs font-bold rounded-xl border transition-all duration-200 cursor-pointer ${
                statusFilter === opt.value
                  ? "bg-indigo-600/10 border-indigo-500 text-indigo-400 font-extrabold shadow-sm"
                  : "bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email address, name, or company..."
            className="w-full bg-slate-900/50 border border-slate-805 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 rounded-2xl pl-11 pr-4 py-3 text-sm text-slate-200 placeholder-slate-500 outline-none transition-all shadow-inner"
          />
        </div>
      </div>

      {/* Main Table */}
      <DataTable
        emails={emails}
        loading={loading}
        page={page}
        totalPages={totalPages}
        totalCount={totalCount}
        onPageChange={(p) => setPage(p)}
      />
    </div>
  );
}
