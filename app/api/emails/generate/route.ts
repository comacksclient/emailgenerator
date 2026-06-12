import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAuth } from "@/lib/auth";
import { generateEmailsForContact } from "@/lib/emailPatterns";

export async function POST(req: NextRequest) {
  const authError = checkAuth(req);
  if (authError) return authError;

  try {
    const body = (await req.json()) as {
      maxPatterns?: number;
      contactIds?: string[];
    };

    const maxPatterns = Math.min(body.maxPatterns ?? 7, 8);

    const contacts = await prisma.contact.findMany({
      where: {
        id: body.contactIds?.length ? { in: body.contactIds } : undefined,
        emails: {
          none: {
            verifyStatus: "VALID",
          },
        },
      },
    });

    if (contacts.length === 0) {
      return NextResponse.json({ error: "No contacts found" }, { status: 404 });
    }

    let generated = 0;
    let skipped = 0;

    for (const contact of contacts) {
      const variants = generateEmailsForContact(
        contact.firstName,
        contact.lastName,
        contact.domain,
        maxPatterns
      );

      if (variants.length === 0) continue;


      const existing = await prisma.email.findMany({
        where: { email: { in: variants.map((v) => v.email) } },
        select: { email: true },
      });
      const existingSet = new Set(existing.map((e: any) => e.email));

      const newOnes = variants.filter((v) => !existingSet.has(v.email));
      skipped += variants.length - newOnes.length;

      if (newOnes.length === 0) continue;

      await prisma.email.createMany({
        data: newOnes.map((v) => ({
          email: v.email,
          pattern: v.pattern,
          patternRank: v.patternRank,
          domain: v.domain,
          contactId: contact.id,
          verifyStatus: "PENDING",
        })),
        skipDuplicates: true,
      });

      generated += newOnes.length;
    }

    return NextResponse.json({ success: true, generated, skipped });
  } catch (err) {
    console.error("generate POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
