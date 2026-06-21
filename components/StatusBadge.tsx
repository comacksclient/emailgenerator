import React from "react";
import { VerifyStatus } from "@/types";

interface StatusBadgeProps {
  status: VerifyStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = {
    VALID: {
      bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
      text: "Valid",
      dot: "bg-emerald-400 animate-pulse",
    },
    CATCH_ALL: {
      bg: "bg-blue-500/10 text-blue-400 border-blue-500/30",
      text: "Catch-all",
      dot: "bg-blue-400 animate-pulse",
    },
    INVALID: {
      bg: "bg-rose-500/10 text-rose-400 border-rose-500/30",
      text: "Invalid",
      dot: "bg-rose-400",
    },
    PENDING: {
      bg: "bg-amber-500/10 text-amber-400 border-amber-500/30",
      text: "Pending",
      dot: "bg-amber-400 animate-pulse",
    },
    UNKNOWN: {
      bg: "bg-slate-500/10 text-slate-400 border-slate-500/30",
      text: "Unknown",
      dot: "bg-slate-400",
    },
  };

  const { bg, text, dot } = config[status] || config.UNKNOWN;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${bg} transition-all duration-300`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {text}
    </span>
  );
}
