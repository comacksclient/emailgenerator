import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const authError = checkAuth(req);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const exportAll = searchParams.get("all") === "true";
    const rankStr = searchParams.get("rank");
    const rank = rankStr ? parseInt(rankStr) : null;
    const jsonMode = searchParams.get("json") === "true";

    const where: any = {};
    if (exportAll) {
      where.result = "VALID";
    } else {
      where.result = "PENDING";
      if (rank !== null && !isNaN(rank)) {
        where.patternRank = rank;
      }
    }

    const emails = await prisma.email.findMany({
      where,
      include: {
        contact: {
          select: { firstName: true, lastName: true, company: true },
        },
      },
      orderBy: [{ domain: "asc" }, { patternRank: "asc" }],
    });

    if (emails.length === 0 && jsonMode) {
      return NextResponse.json({ success: true, emails: [] });
    }

    if (jsonMode) {
      return NextResponse.json({
        success: true,
        emails: emails.map((e: any) => e.email),
      });
    }

    const header = exportAll
      ? "first_name,last_name,company,domain,email,result,verified"
      : "email,contact_name,company,pattern,domain";

    const rows = emails.map((e: any) => {
      const firstName = e.contact?.firstName ?? "";
      const lastName = e.contact?.lastName ?? "";
      const company = e.contact?.company ?? "";
      const domain = e.domain ?? "";
      const email = e.email ?? "";
      const result = e.result ?? "";
      const verified = e.verifiedAt ? new Date(e.verifiedAt).toISOString() : "";

      if (exportAll) {
        return `"${firstName}","${lastName}","${company}","${domain}","${email}","${result}","${verified}"`;
      }
      const name = `${firstName} ${lastName}`;
      return `"${email}","${name}","${company}","${e.pattern}","${domain}"`;
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
