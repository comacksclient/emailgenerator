"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  UploadCloud,
  Wand2,
  CheckSquare,
  Database,
  Mail,
  Menu,
  X,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

export function Nav() {
  const pathname = usePathname();
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    async function checkPending() {
      try {
        const res = await apiFetch("/api/database?status=pending");
        if (res.ok) {
          const data = await res.json();
          setPendingCount(data.total || 0);
        }
      } catch (err) {
        console.error("Failed to check pending emails count", err);
      }
    }

    checkPending();
    const interval = setInterval(checkPending, 30000);
    return () => clearInterval(interval);
  }, [pathname]);

  // Close mobile sidebar on route transition
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const navItems = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "Ingest Contacts",
      href: "/ingest",
      icon: UploadCloud,
    },
    {
      name: "Generate Emails",
      href: "/generate",
      icon: Wand2,
    },
    {
      name: "Verify (Apify)",
      href: "/verify",
      icon: CheckSquare,
      badge: pendingCount > 0 ? pendingCount : null,
    },
    {
      name: "Email Database",
      href: "/database",
      icon: Database,
    },
  ];

  const sidebarContent = (
    <>
      <div className="p-6 border-b border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg text-white shadow-lg shadow-indigo-600/30">
            <Mail className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-white text-lg tracking-wide leading-tight">
              EmailGenai
            </h1>
            <p className="text-xs text-indigo-400 font-medium">
              Admin Workspace
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group text-sm font-medium ${isActive
                ? "bg-indigo-600/10 border border-indigo-500/20 text-indigo-400"
                : "hover:bg-slate-800/60 hover:text-slate-100 border border-transparent"
                }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-5 h-5 transition-transform duration-200 group-hover:scale-105 ${isActive
                    ? "text-indigo-400"
                    : "text-slate-400 group-hover:text-slate-200"
                    }`}
                />
                <span>{item.name}</span>
              </div>

              {item.badge !== undefined && item.badge !== null && (
                <span className="flex items-center justify-center min-w-5 h-5 px-1.5 text-[10px] font-extrabold bg-indigo-500 text-white rounded-full animate-pulse">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800 text-center">
        <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">
          v1.0.0 · Manual Apify Flow
        </p>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Top Header */}
      <header className="lg:hidden flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800 sticky top-0 z-40 select-none">
        <div className="flex items-center gap-2.5">
          <div className="bg-indigo-600 p-1.5 rounded-lg text-white">
            <Mail className="w-5 h-5" />
          </div>
          <span className="font-extrabold text-white text-base tracking-wide">
            EmailGenai
          </span>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors focus:outline-none"
        >
          <Menu className="w-6 h-6" />
        </button>
      </header>

      {/* Mobile Drawer Menu Overlay */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300"
          />

          {/* Drawer Panel */}
          <aside className="relative w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-full text-slate-300 shadow-2xl animate-slideRight">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Desktop Permanent Sidebar */}
      <aside className="hidden lg:flex w-64 bg-slate-900 border-r border-slate-800 flex-col h-screen text-slate-300 select-none sticky top-0">
        {sidebarContent}
      </aside>
    </>
  );
}
