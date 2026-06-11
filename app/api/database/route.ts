import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAuth } from "@/lib/auth";
import { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  const authError = checkAuth(req);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") ?? "all";
    const search = searchParams.get("search") ?? "";
    const page = Math.max(parseInt(searchParams.get("page") ?? "1"), 1);
    const pageSize = 50;

    const where: Prisma.EmailWhereInput = {};

    if (status !== "all") {
      where.verifyStatus = status.toUpperCase() as
        | "PENDING"
        | "VALID"
        | "INVALID"
        | "UNKNOWN";
    }

    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        {
          contact: {
            firstName: { contains: search, mode: "insensitive" },
          },
        },
        {
          contact: {
            lastName: { contains: search, mode: "insensitive" },
          },
        },
        {
          contact: {
            company: { contains: search, mode: "insensitive" },
          },
        },
      ];
    }

    const [emails, total, stats] = await Promise.all([
      prisma.email.findMany({
        where,
        include: {
          contact: {
            select: {
              firstName: true,
              lastName: true,
              company: true,
            },
          },
        },
        orderBy: [{ verifyStatus: "asc" }, { patternRank: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.email.count({ where }),
      prisma.email.groupBy({
        by: ["verifyStatus"],
        _count: { _all: true },
      }),
    ]);

    return NextResponse.json({
      emails,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      stats: Object.fromEntries(
        stats.map((s) => [s.verifyStatus, s._count._all])
      ),
    });
  } catch (err) {
    console.error("database GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
