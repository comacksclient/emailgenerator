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


    const upserted = await prisma.$transaction(
      valid.map((c) =>
        prisma.contact.upsert({
          where: {
            firstName_lastName_company: {
              firstName: c.firstName,
              lastName: c.lastName,
              company: c.company,
            },
          },
          update: { domain: c.domain },
          create: {
            firstName: c.firstName,
            lastName: c.lastName,
            company: c.company,
            domain: c.domain,
          },
        })
      )
    );

    return NextResponse.json({
      success: true,
      inserted: upserted.length,
      skipped,
      errors,
    });
  } catch (err) {
    console.error("contacts POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
