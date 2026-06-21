import React from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Users,
  Mail,
  CheckCircle,
  Clock,
  ArrowRight,
  UploadCloud,
} from "lucide-react";

export const revalidate = 0;

export default async function DashboardPage() {
  try {
    const [
      totalContacts,
      totalEmails,
      validEmails,
      pendingEmails,
      recentEmails,
    ] = await Promise.all([
      prisma.contact.count(),
      prisma.email.count(),
      prisma.email.count({ where: { result: "VALID" } }),
      prisma.email.count({ where: { result: "PENDING" } }),
      prisma.email.findMany({
        take: 10,
        orderBy: [{ result: "desc" }, { updatedAt: "desc" }],
        include: {
          contact: {
            select: {
              firstName: true,
              lastName: true,
              company: true,
            },
          },
        },
      }),
    ]);

    if (totalContacts === 0) {
      return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-20 h-20 bg-slate-900 border border-slate-800 rounded-3xl flex items-center justify-center text-indigo-400 mb-6 shadow-2xl">
            <UploadCloud className="w-10 h-10 animate-bounce" />
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
            Start Your Verification Pipeline
          </h2>
          <p className="mt-4 max-w-lg text-slate-400 text-base leading-relaxed">
            Welcome to EmailGen! You haven't imported any contact list yet. Upload a list of names and domains to kick off.
          </p>
          <div className="mt-8">
            <Link
              href="/ingest"
              className="inline-flex items-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold rounded-2xl shadow-lg shadow-indigo-600/30 transition-all duration-200"
            >
              Upload Contacts CSV
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      );
    }

    const stats = [
      {
        name: "Total Contacts",
        value: totalContacts,
        icon: Users,
        color: "from-blue-600/20 to-blue-500/5 text-blue-400 border-blue-500/20",
      },
      {
        name: "Generated Candidates",
        value: totalEmails,
        icon: Mail,
        color: "from-indigo-600/20 to-indigo-500/5 text-indigo-400 border-indigo-500/20",
      },
      {
        name: "Verified Valid Emails",
        value: validEmails,
        icon: CheckCircle,
        color: "from-emerald-600/20 to-emerald-500/5 text-emerald-400 border-emerald-500/20",
      },
      {
        name: "Pending Verification",
        value: pendingEmails,
        icon: Clock,
        color: "from-amber-600/20 to-amber-500/5 text-amber-400 border-amber-500/20",
      },
    ];

    return (
      <div className="space-y-10 max-w-7xl mx-auto">
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">
            Workspace Dashboard
          </h2>
          <p className="mt-2 text-slate-400 text-sm">
            Overview of your contact database and verification status counts.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.name}
                className={`bg-gradient-to-br ${stat.color} border p-6 rounded-2xl flex items-center justify-between shadow-lg shadow-slate-950/20 backdrop-blur-md`}
              >
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {stat.name}
                  </p>
                  <p className="mt-2 text-3xl font-extrabold text-white">
                    {stat.value.toLocaleString()}
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Recent Activity Table */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">
                Recent Pipeline Additions
              </h3>
              <p className="text-slate-400 text-xs mt-1">
                Last 10 email pattern candidates created.
              </p>
            </div>
            <Link
              href="/database"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              View Full Database
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-md shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/40 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                    <th className="py-4 px-6">Contact Name</th>
                    <th className="py-4 px-6">Email Address</th>
                    <th className="py-4 px-6">Company</th>
                    <th className="py-4 px-6">Pattern</th>
                    <th className="py-4 px-6">Result</th>
                    <th className="py-4 px-6">Verified At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-sm">
                  {recentEmails.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-10 text-center text-slate-500 font-medium"
                      >
                        No email candidates generated yet.
                      </td>
                    </tr>
                  ) : (
                    recentEmails.map((email) => {
                      const contactName = email.contact
                        ? `${email.contact.firstName} ${email.contact.lastName}`
                        : "Unknown Contact";
                      const formatVerifiedDate = (dateStr: Date | null) => {
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
                        <tr
                          key={email.id}
                          className="hover:bg-slate-800/20 text-slate-300 transition-all duration-150"
                        >
                          <td className="py-4 px-6">{contactName}</td>
                          <td className="py-4 px-6 font-mono text-xs text-indigo-400 font-semibold select-all">
                            {email.email}
                          </td>
                          <td className="py-4 px-6">
                            {email.contact?.company || "-"}
                          </td>
                          <td className="py-4 px-6">
                            <span className="font-mono text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded">
                              {email.pattern}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <StatusBadge status={email.result} />
                          </td>
                          <td className="py-4 px-6 text-slate-500 text-xs">
                            {formatVerifiedDate(email.verifiedAt)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  } catch (err) {
    console.error("Dashboard page query error:", err);
    return (
      <div className="p-6 text-center">
        <h2 className="text-red-400 text-xl font-bold">Database Error</h2>
        <p className="text-slate-400 mt-2 text-sm">
          Failed to load dashboard statistics. Please ensure database connection is established and migrations have been run.
        </p>
      </div>
    );
  }
}
