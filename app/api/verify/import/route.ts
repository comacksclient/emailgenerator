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

    // 1. Fetch matching emails in bulk
    const emailsInDb = await prisma.email.findMany({
      where: {
        email: { in: rows.map((r) => r.email) },
      },
      select: {
        id: true,
        email: true,
        result: true,
        contactId: true,
      },
    });

    const emailMap = new Map<string, typeof emailsInDb[0]>();
    for (const e of emailsInDb) {
      emailMap.set(e.email.toLowerCase(), e);
    }

    const idsToDelete: string[] = [];
    const validEmailIds: string[] = [];
    const catchAllEmailIds: string[] = [];
    const contactIdsToClean: string[] = [];

    for (const row of rows) {
      const status = normalizeStatus(
        row.status,
        row.technicalStatus,
        row.formatStatus,
        row.resultVal,
        row.quality
      );

      const existing = emailMap.get(row.email.toLowerCase());

      if (!existing) {
        skipped++;
        continue;
      }

      if (
        existing.result === "VALID" ||
        existing.result === "INVALID" ||
        existing.result === "CATCH_ALL"
      ) {
        skipped++;
        continue;
      }

      if (status === "VALID") {
        validEmailIds.push(existing.id);
        contactIdsToClean.push(existing.contactId);
        markedValid++;
      } else if (status === "CATCH_ALL") {
        catchAllEmailIds.push(existing.id);
        contactIdsToClean.push(existing.contactId);
        markedValid++;
      } else if (status === "INVALID") {
        idsToDelete.push(existing.id);
        deleted++;
      } else {
        markedUnknown++;
      }
    }

    // 2. Perform bulk updates for VALID
    if (validEmailIds.length > 0) {
      await prisma.email.updateMany({
        where: { id: { in: validEmailIds } },
        data: { result: "VALID", verifiedAt: new Date() },
      });
    }

    // 3. Perform bulk updates for CATCH_ALL
    if (catchAllEmailIds.length > 0) {
      await prisma.email.updateMany({
        where: { id: { in: catchAllEmailIds } },
        data: { result: "CATCH_ALL", verifiedAt: new Date() },
      });
    }

    // 4. Perform bulk deletion of other patterns for validated contacts
    if (contactIdsToClean.length > 0) {
      const allKeepIds = [...validEmailIds, ...catchAllEmailIds];
      await prisma.email.deleteMany({
        where: {
          contactId: { in: contactIdsToClean },
          id: { notIn: allKeepIds },
        },
      });
    }

    // 5. Perform bulk deletion of INVALID emails
    if (idsToDelete.length > 0) {
      await prisma.email.deleteMany({
        where: { id: { in: idsToDelete } },
      });
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
