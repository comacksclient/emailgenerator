export type VerifyStatus = "PENDING" | "VALID" | "INVALID" | "UNKNOWN";

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  company: string;
  domain: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Email {
  id: string;
  email: string;
  pattern: string;
  patternRank: number;
  domain: string;
  verifyStatus: VerifyStatus;
  verifiedAt: string | null;
  contactId: string;
  contact?: Contact;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  totalContacts: number;
  totalEmails: number;
  validEmails: number;
  pendingEmails: number;
}
