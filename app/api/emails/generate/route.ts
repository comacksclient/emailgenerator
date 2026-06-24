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
            result: "VALID",
          },
        },
      },
    });

    if (contacts.length === 0) {
      return NextResponse.json({ error: "No contacts found" }, { status: 404 });
    }

    const allVariants: { email: string; pattern: string; patternRank: number; domain: string; contactId: string }[] = [];
    const contactVariantsMap = new Map<string, typeof allVariants>();

    // 1. Generate all variant combinations in memory
    for (const contact of contacts) {
      const variants = generateEmailsForContact(
        contact.firstName,
        contact.lastName,
        contact.domain,
        maxPatterns
      );
      if (variants.length > 0) {
        const mapped = variants.map((v) => ({
          email: v.email,
          pattern: v.pattern,
          patternRank: v.patternRank,
          domain: v.domain,
          contactId: contact.id,
        }));
        allVariants.push(...mapped);
        contactVariantsMap.set(contact.id, mapped);
      }
    }

    if (allVariants.length === 0) {
      return NextResponse.json({ success: true, generated: 0, skipped: 0 });
    }

    // 2. Fetch all existing email variants in a single bulk query
    const existing = await prisma.email.findMany({
      where: { email: { in: allVariants.map((v) => v.email) } },
      select: { email: true },
    });
    const existingSet = new Set(existing.map((e: any) => e.email.toLowerCase()));

    // 3. Filter out existing emails
    const newEmailsToInsert = allVariants.filter(
      (v) => !existingSet.has(v.email.toLowerCase())
    );

    let generated = 0;

    // 4. Bulk insert new candidate emails
    if (newEmailsToInsert.length > 0) {
      const createResult = await prisma.email.createMany({
        data: newEmailsToInsert.map((v) => ({
          email: v.email,
          pattern: v.pattern,
          patternRank: v.patternRank,
          domain: v.domain,
          contactId: v.contactId,
          result: "PENDING" as const,
        })),
        skipDuplicates: true,
      });
      generated = createResult.count;
    }

    const skipped = allVariants.length - generated;

    return NextResponse.json({ success: true, generated, skipped });
  } catch (err) {
    console.error("generate POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
