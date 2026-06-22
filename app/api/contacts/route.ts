import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAuth } from "@/lib/auth";
import { parseContactsCSV } from "@/lib/csvParser";

export async function POST(req: NextRequest) {
  const authError = checkAuth(req);
  if (authError) return authError;

  try {
    const { csv } = (await req.json()) as { csv: string };

    if (!csv?.trim()) {
      return NextResponse.json({ error: "No CSV data provided" }, { status: 400 });
    }

    const { valid, skipped, errors } = parseContactsCSV(csv);

    if (valid.length === 0) {
      return NextResponse.json(
        { error: "No valid rows found", errors },
        { status: 400 }
      );
    }


    // 1. Fetch all existing contacts in a single query
    const existingContacts = await prisma.contact.findMany({
      where: {
        OR: valid.map((c) => ({
          firstName: c.firstName,
          lastName: c.lastName,
          company: c.company,
        })),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        company: true,
        domain: true,
      },
    });

    // 2. Map existing contacts for fast lookup
    const existingMap = new Map<string, typeof existingContacts[0]>();
    for (const ec of existingContacts) {
      const key = `${ec.firstName.toLowerCase()}_${ec.lastName.toLowerCase()}_${ec.company.toLowerCase()}`;
      existingMap.set(key, ec);
    }

    const toCreate: typeof valid = [];
    const toUpdate: { id: string; domain: string }[] = [];

    // 3. Categorize incoming contacts
    for (const c of valid) {
      const key = `${c.firstName.toLowerCase()}_${c.lastName.toLowerCase()}_${c.company.toLowerCase()}`;
      const ec = existingMap.get(key);

      if (!ec) {
        toCreate.push(c);
      } else if (ec.domain !== c.domain) {
        toUpdate.push({ id: ec.id, domain: c.domain });
      }
    }

    let inserted = 0;

    // 4. Bulk insert new contacts
    if (toCreate.length > 0) {
      const createResult = await prisma.contact.createMany({
        data: toCreate,
        skipDuplicates: true,
      });
      inserted += createResult.count;
    }

    // 5. Update only contacts whose domains changed (rare case)
    for (const item of toUpdate) {
      try {
        await prisma.contact.update({
          where: { id: item.id },
          data: { domain: item.domain },
        });
        inserted++;
      } catch (err) {
        console.error("Failed to update domain for contact ID:", item.id, err);
      }
    }

    return NextResponse.json({
      success: true,
      inserted,
      skipped,
      errors,
    });
  } catch (err) {
    console.error("contacts POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
