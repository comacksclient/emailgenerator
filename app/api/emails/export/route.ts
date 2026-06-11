import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const authError = checkAuth(req);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const exportAll = searchParams.get("all") === "true";


    const emails = await prisma.email.findMany({
      where: exportAll ? undefined : { verifyStatus: "PENDING" },
      include: {
        contact: {
          select: { firstName: true, lastName: true, company: true },
        },
      },
      orderBy: [{ domain: "asc" }, { patternRank: "asc" }],
    });

    if (emails.length === 0) {
      return NextResponse.json(
        { error: "No emails to export" },
        { status: 404 }
      );
    }


    const header = exportAll
      ? "email,contact_name,company,pattern,domain,status"
      : "email,contact_name,company,pattern,domain";

    const rows = emails.map((e) => {
      const name = `${e.contact.firstName} ${e.contact.lastName}`;
      const company = e.contact.company ?? "";
      if (exportAll) {
        return `"${e.email}","${name}","${company}","${e.pattern}","${e.domain}","${e.verifyStatus}"`;
      }
      return `"${e.email}","${name}","${company}","${e.pattern}","${e.domain}"`;
    });

    const csv = [header, ...rows].join("\n");
    const prefix = exportAll ? "all_emails" : "pending_emails";
    const filename = `${prefix}_${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("export GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
