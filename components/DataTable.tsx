import React from "react";
import { Email } from "@/types";
import { StatusBadge } from "./StatusBadge";
import { Calendar, Building2, User2 } from "lucide-react";

interface DataTableProps {
  emails: Email[];
  loading: boolean;
  page: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (page: number) => void;
}

export function DataTable({
  emails,
  loading,
  page,
  totalPages,
  totalCount,
  onPageChange,
}: DataTableProps) {
  const formatVerifiedDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "-";
    }
  };

  return (
    <div className="w-full flex flex-col bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-md shadow-2xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/40 text-slate-400 text-xs font-semibold uppercase tracking-wider">
              <th className="py-4 px-6">First Name</th>
              <th className="py-4 px-6">Last Name</th>
              <th className="py-4 px-6">Company</th>
              <th className="py-4 px-6">Domain</th>
              <th className="py-4 px-6">Email Address</th>
              <th className="py-4 px-6">Result</th>
              <th className="py-4 px-6">Verified At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-sm">
            {loading ? (
              // Loading Skeleton State
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={idx} className="animate-pulse">
                  <td className="py-4 px-6">
                    <div className="h-4 bg-slate-800 rounded w-20" />
                  </td>
                  <td className="py-4 px-6">
                    <div className="h-4 bg-slate-800 rounded w-20" />
                  </td>
                  <td className="py-4 px-6">
                    <div className="h-4 bg-slate-800 rounded w-24" />
                  </td>
                  <td className="py-4 px-6">
                    <div className="h-4 bg-slate-800 rounded w-20" />
                  </td>
                  <td className="py-4 px-6">
                    <div className="h-4 bg-slate-800 rounded w-48" />
                  </td>
                  <td className="py-4 px-6">
                    <div className="h-6 bg-slate-800 rounded-full w-20" />
                  </td>
                  <td className="py-4 px-6">
                    <div className="h-4 bg-slate-800 rounded w-32" />
                  </td>
                </tr>
              ))
            ) : emails.length === 0 ? (
              // Empty State
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-500 font-medium">
                  No email addresses found matching your search.
                </td>
              </tr>
            ) : (
              // Data Rows
              emails.map((email) => {
                return (
                  <tr
                    key={email.id}
                    className="hover:bg-slate-800/30 text-slate-300 transition-colors duration-150"
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <User2 className="w-3.5 h-3.5 text-slate-500" />
                        <span>{email.contact?.firstName || "-"}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span>{email.contact?.lastName || "-"}</span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-slate-500" />
                        <span>{email.contact?.company || "-"}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-mono text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded">
                        {email.domain}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-mono text-xs text-indigo-400 select-all font-semibold">
                      {email.email}
                    </td>
                    <td className="py-4 px-6">
                      <StatusBadge status={email.result} />
                    </td>
                    <td className="py-4 px-6 text-slate-500 text-xs">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-slate-600" />
                        <span>{formatVerifiedDate(email.verifiedAt)}</span>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {!loading && totalPages > 0 && (
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900/30 border-t border-slate-800 text-slate-400 text-xs font-semibold select-none">
          <div>
            Showing <span className="text-slate-200">{emails.length}</span> of{" "}
            <span className="text-slate-200">{totalCount}</span> results
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 border border-slate-700/50 text-slate-200 transition-all active:scale-95 disabled:active:scale-100"
            >
              Previous
            </button>
            <span className="text-slate-300">
              Page <span className="text-indigo-400 font-bold">{page}</span> of{" "}
              <span className="text-slate-200 font-bold">{totalPages}</span>
            </span>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 border border-slate-700/50 text-slate-200 transition-all active:scale-95 disabled:active:scale-100"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
