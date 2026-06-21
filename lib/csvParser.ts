import Papa from "papaparse";
import { normalizeDomain } from "./emailPatterns";

export interface ContactRow {
  firstName: string;
  lastName: string;
  company: string;
  domain: string;
}

export interface ParseResult {
  valid: ContactRow[];
  skipped: number;
  errors: string[];
}

export function parseContactsCSV(csvText: string): ParseResult {
  const result = Papa.parse<string[]>(csvText.trim(), {
    header: false,
    skipEmptyLines: true,
  });

  const rawRows = result.data;
  const valid: ContactRow[] = [];
  const errors: string[] = [];
  let skipped = 0;

  if (rawRows.length === 0) {
    return { valid, skipped, errors };
  }

  const firstRow = rawRows[0];
  let hasHeader = false;
  let firstNameIdx = -1;
  let lastNameIdx = -1;
  let fullNameIdx = -1;
  let companyIdx = -1;
  let domainIdx = -1;

  const cleanHeader = (h: string) => h.trim().toLowerCase().replace(/[\s_]+/g, "");

  for (let i = 0; i < firstRow.length; i++) {
    const val = cleanHeader(firstRow[i] || "");
    if (val === "firstname" || val === "firstname" || val === "first_name" || val === "first") {
      firstNameIdx = i;
      hasHeader = true;
    } else if (val === "lastname" || val === "lastname" || val === "last_name" || val === "last") {
      lastNameIdx = i;
      hasHeader = true;
    } else if (val === "fullname" || val === "fullname" || val === "full_name" || val === "name") {
      fullNameIdx = i;
      hasHeader = true;
    } else if (val === "company" || val === "companyname" || val === "company_name") {
      companyIdx = i;
      hasHeader = true;
    } else if (val === "domain" || val === "companydomain" || val === "company_domain") {
      domainIdx = i;
      hasHeader = true;
    }
  }

  if (!hasHeader) {
    for (let i = 0; i < firstRow.length; i++) {
      const val = (firstRow[i] || "").trim().toLowerCase();
      if (val.includes(".") && !val.includes(" ") && !val.includes("@")) {
        domainIdx = i;
        break;
      }
    }

    const nonDomainIdxs: number[] = [];
    for (let i = 0; i < firstRow.length; i++) {
      if (i !== domainIdx) {
        nonDomainIdxs.push(i);
      }
    }

    if (nonDomainIdxs.length === 1) {
      fullNameIdx = nonDomainIdxs[0];
    } else if (nonDomainIdxs.length === 2) {
      firstNameIdx = nonDomainIdxs[0];
      lastNameIdx = nonDomainIdxs[1];
    } else if (nonDomainIdxs.length >= 3) {
      firstNameIdx = nonDomainIdxs[0];
      lastNameIdx = nonDomainIdxs[1];
      companyIdx = nonDomainIdxs[2];
    }
  }

  const startRowIndex = hasHeader ? 1 : 0;

  for (let i = startRowIndex; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row) continue;
    const lineNum = i + 1;

    const fullName = fullNameIdx !== -1 ? (row[fullNameIdx] || "").trim() : "";
    let firstName = firstNameIdx !== -1 ? (row[firstNameIdx] || "").trim() : "";
    let lastName = lastNameIdx !== -1 ? (row[lastNameIdx] || "").trim() : "";

    if ((!firstName || !lastName) && fullName) {
      const parts = fullName.split(/\s+/);
      if (!firstName) firstName = parts[0] || "";
      if (!lastName) lastName = parts.slice(1).join(" ") || "";
    }

    const domain = domainIdx !== -1 ? normalizeDomain(row[domainIdx] || "") : "";
    const company = companyIdx !== -1 ? (row[companyIdx] || "").trim() : "";

    if (!firstName || !lastName) {
      errors.push(`Row ${lineNum}: missing first or last name — skipped`);
      skipped++;
      continue;
    }

    if (!domain) {
      errors.push(`Row ${lineNum}: ${firstName} ${lastName} — no domain — skipped`);
      skipped++;
      continue;
    }

    if (!domain.includes(".") || domain.includes(" ")) {
      errors.push(`Row ${lineNum}: "${domain}" is not a valid domain — skipped`);
      skipped++;
      continue;
    }

    valid.push({ firstName, lastName, company, domain });
  }

  return { valid, skipped, errors };
}

export interface VerifyRow {
  email: string;
  status: string;
  technicalStatus: string;
  formatStatus: string;
  resultVal: string;
  quality: string;
}

export function parseVerifyResultCSV(csvText: string): VerifyRow[] {
  const result = Papa.parse<string[]>(csvText.trim(), {
    header: false,
    skipEmptyLines: true,
  });

  const rawRows = result.data;
  if (rawRows.length === 0) return [];

  const firstRow = rawRows[0];
  let hasHeader = false;
  let emailIdx = -1;
  let statusIdx = -1;
  let techStatusIdx = -1;
  let formatStatusIdx = -1;
  let resultIdx = -1;
  let qualityIdx = -1;

  const cleanHeader = (h: string) => h.trim().toLowerCase().replace(/[\s_]+/g, "");

  for (let i = 0; i < firstRow.length; i++) {
    const val = cleanHeader(firstRow[i] || "");
    if (val === "email" || val === "normalizedemail") {
      emailIdx = i;
      hasHeader = true;
    } else if (val === "status") {
      statusIdx = i;
      hasHeader = true;
    } else if (val === "technicalstatus") {
      techStatusIdx = i;
      hasHeader = true;
    } else if (val === "formatstatus" || val === "format") {
      formatStatusIdx = i;
      hasHeader = true;
    } else if (val === "result") {
      resultIdx = i;
      hasHeader = true;
    } else if (val === "quality") {
      qualityIdx = i;
      hasHeader = true;
    }
  }

  if (!hasHeader) {
    for (let i = 0; i < firstRow.length; i++) {
      if ((firstRow[i] || "").includes("@")) {
        emailIdx = i;
        break;
      }
    }
    if (emailIdx !== -1) {
      statusIdx = emailIdx === 0 ? 1 : 0;
    } else {
      emailIdx = 0;
      statusIdx = 1;
    }
  }

  const parsedRows: VerifyRow[] = [];
  const startRowIndex = hasHeader ? 1 : 0;

  for (let i = startRowIndex; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row) continue;
    const email = (row[emailIdx] || "").trim().toLowerCase();
    
    if (!email || !email.includes("@")) continue;

    const status = statusIdx !== -1 ? (row[statusIdx] || "").trim().toLowerCase() : "";
    const technicalStatus = techStatusIdx !== -1 ? (row[techStatusIdx] || "").trim().toLowerCase() : "";
    const formatStatus = formatStatusIdx !== -1 ? (row[formatStatusIdx] || "").trim().toLowerCase() : "";
    const resultVal = resultIdx !== -1 ? (row[resultIdx] || "").trim().toLowerCase() : "";
    const quality = qualityIdx !== -1 ? (row[qualityIdx] || "").trim().toLowerCase() : "";

    parsedRows.push({
      email,
      status,
      technicalStatus,
      formatStatus,
      resultVal,
      quality,
    });
  }

  return parsedRows;
}

export function normalizeStatus(
  status: string,
  technicalStatus?: string,
  formatStatus?: string,
  resultVal?: string,
  quality?: string
): "VALID" | "INVALID" | "UNKNOWN" {
  const s = status.toLowerCase().trim();
  const ts = (technicalStatus || "").toLowerCase().trim();
  const fs = (formatStatus || "").toLowerCase().trim();
  const rv = (resultVal || "").toLowerCase().trim();
  const q = (quality || "").toLowerCase().trim();

  // 1. Explicitly check technical status first
  if (ts) {
    if (ts === "valid") return "VALID";
    if (ts === "invalid" || ts === "disposable") return "INVALID";
    if (ts === "catch_all" || ts === "unknown" || ts === "error") return "UNKNOWN";
  }

  // 2. Check formatStatus, resultVal, quality, then status
  for (const val of [fs, rv, q, s]) {
    if (!val) continue;
    if (
      [
        "good",
        "valid",
        "true",
        "1",
        "ok",
        "deliverable",
        "yes",
        "format_ok",
        "valid_syntax",
      ].includes(val)
    ) {
      return "VALID";
    }

    if (
      [
        "bad",
        "invalid",
        "false",
        "0",
        "undeliverable",
        "no",
        "bounced",
        "disposable",
        "format_error",
        "invalid_syntax",
      ].includes(val)
    ) {
      return "INVALID";
    }
  }

  // "risky" or "catch_all" defaults to UNKNOWN (stays PENDING for verification flow safety)
  return "UNKNOWN";
}
