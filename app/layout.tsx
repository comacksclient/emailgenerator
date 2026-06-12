import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/Nav";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "EmailGenai Pipeline Workspace",
  description: "Generate and verify professional emails at scale.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full bg-slate-950 text-slate-100 dark">
      <body className={`${inter.className} min-h-full flex antialiased`}>
        <div className="flex flex-col lg:flex-row w-full min-h-screen bg-slate-950">
          <Nav />
          <main className="flex-1 bg-slate-950 p-4 sm:p-8 overflow-y-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
