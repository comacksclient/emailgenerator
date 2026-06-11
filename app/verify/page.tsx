import React from "react";
import { prisma } from "@/lib/prisma";
import { VerifyClient } from "./VerifyClient";

export const revalidate = 0;

export default async function VerifyPage() {
  const pendingCount = await prisma.email.count({
    where: {
      verifyStatus: "PENDING",
    },
  });

  return <VerifyClient initialPendingCount={pendingCount} />;
}
