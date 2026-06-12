import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAuth } from "@/lib/auth";
import { parseVerifyResultCSV, normalizeStatus } from "@/lib/csvParser";

export async function POST(req: NextRequest) {
  const authError = checkAuth(req);
  if (authError) return authError;

  try {
    const { csv } = (await req.json()) as { csv: string };

    if (!csv?.trim()) {
      return NextResponse.json({ error: "No CSV data provided" }, { status: 400 });
    }

    const rows = parseVerifyResultCSV(csv);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "No valid rows found — expected columns: email, status" },
        { status: 400 }
      );
    }

    let markedValid = 0;
    let deleted = 0;
    let markedUnknown = 0;
    let skipped = 0;

    for (const row of rows) {
      const status = normalizeStatus(row.status, row.technicalStatus);

      const existing = await prisma.email.findUnique({
        where: { email: row.email },
        select: { id: true, verifyStatus: true, contactId: true },
      });


      if (!existing) {
        skipped++;
        continue;
      }


      if (
        existing.verifyStatus === "VALID" ||
        existing.verifyStatus === "INVALID"
      ) {
        skipped++;
        continue;
      }

      if (status === "VALID") {
        await prisma.email.update({
          where: { id: existing.id },
          data: { verifyStatus: "VALID", verifiedAt: new Date() },
        });

        // Cost Optimization: Delete all other candidate email options for this contact
        // since we found and validated their correct deliverable email.
        await prisma.email.deleteMany({
          where: {
            contactId: existing.contactId,
            id: { not: existing.id },
          },
        });

        markedValid++;
      } else if (status === "INVALID") {
        await prisma.email.update({
          where: { id: existing.id },
          data: { verifyStatus: "INVALID", verifiedAt: new Date() },
        });
        deleted++;
      } else {

        markedUnknown++;
      }
    }

    return NextResponse.json({
      success: true,
      markedValid,
      deleted,
      markedUnknown,
      skipped,
    });
  } catch (err) {
    console.error("verify/import POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
