import React from "react";
import { prisma } from "@/lib/prisma";
import { GenerateClient } from "./GenerateClient";

export const revalidate = 0;

export default async function GeneratePage() {
  const totalContacts = await prisma.contact.count();
  const contactsWithoutEmails = await prisma.contact.count({
    where: {
      emails: {
        none: {},
      },
    },
  });

  return (
    <GenerateClient
      totalContacts={totalContacts}
      contactsWithoutEmails={contactsWithoutEmails}
    />
  );
}
