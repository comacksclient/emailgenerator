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
      where.result = status.toUpperCase() as
        | "PENDING"
        | "VALID"
        | "INVALID"
        | "UNKNOWN"
        | "CATCH_ALL";
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
        orderBy: [{ result: "desc" }, { updatedAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.email.count({ where }),
      prisma.email.groupBy({
        by: ["result"],
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
        stats.map((s) => [s.result, s._count._all])
      ),
    });
  } catch (err) {
    console.error("database GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const authError = checkAuth(req);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    if (action === "clear_all") {
      // Deleting all contacts will cascade-delete all emails
      const contactsDeleted = await prisma.contact.deleteMany();
      return NextResponse.json({
        success: true,
        message: "Successfully reset database.",
        count: contactsDeleted.count,
      });
    }

    if (action === "delete_pending") {
      const deletedEmails = await prisma.email.deleteMany({
        where: { result: "PENDING" },
      });
      return NextResponse.json({
        success: true,
        message: "Successfully cleared all pending emails.",
        count: deletedEmails.count,
      });
    }

    if (action === "delete_invalid") {
      const deletedEmails = await prisma.email.deleteMany({
        where: { result: "INVALID" },
      });
      return NextResponse.json({
        success: true,
        message: "Successfully cleared all invalid emails.",
        count: deletedEmails.count,
      });
    }

    if (action === "delete_email") {
      const id = searchParams.get("id");
      if (!id) {
        return NextResponse.json({ error: "Missing email ID" }, { status: 400 });
      }
      await prisma.email.delete({
        where: { id },
      });
      return NextResponse.json({
        success: true,
        message: "Successfully deleted email candidate.",
      });
    }

    return NextResponse.json({ error: "Invalid action parameter" }, { status: 400 });
  } catch (err) {
    console.error("database DELETE error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
