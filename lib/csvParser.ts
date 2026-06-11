import Papa from "papaparse";

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
  const result = Papa.parse<Record<string, string>>(csvText.trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, "_"),
  });

  const valid: ContactRow[] = [];
  const errors: string[] = [];
  let skipped = 0;

  for (const [i, row] of result.data.entries()) {
    const lineNum = i + 2;


    const firstName = (
      row["first_name"] ||
      row["firstname"] ||
      row["first"] ||
      ""
    ).trim();

    const lastName = (
      row["last_name"] ||
      row["lastname"] ||
      row["last"] ||
      ""
    ).trim();

    const domain = (row["domain"] || row["company_domain"] || "")
      .trim()
      .toLowerCase()
      .replace(/^@/, "")
      .replace(/\/$/, "");

    const company = (row["company"] || row["company_name"] || "").trim();

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
}

export function parseVerifyResultCSV(csvText: string): VerifyRow[] {
  const result = Papa.parse<Record<string, string>>(csvText.trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase().replace(/[\s_]+/g, ""),
  });

  return result.data
    .map((row) => {
      let email = "";
      let status = "";
      let technicalStatus = "";

      for (const [key, val] of Object.entries(row)) {
        const cleanKey = key.trim().toLowerCase().replace(/[\s_]+/g, "");
        if (cleanKey === "email" || cleanKey === "normalizedemail") {
          email = val.trim().toLowerCase();
        } else if (cleanKey === "status") {
          status = val.trim().toLowerCase();
        } else if (cleanKey === "technicalstatus") {
          technicalStatus = val.trim().toLowerCase();
        }
      }

      return { email, status, technicalStatus };
    })
    .filter((r) => r.email.length > 0 && r.email.includes("@"));
}

export function normalizeStatus(
  status: string,
  technicalStatus?: string
): "VALID" | "INVALID" | "UNKNOWN" {
  const s = status.toLowerCase().trim();
  const ts = (technicalStatus || "").toLowerCase().trim();

  // 1. Explicitly check technical status first
  if (ts) {
    if (ts === "valid") return "VALID";
    if (ts === "invalid" || ts === "disposable") return "INVALID";
    if (ts === "catch_all" || ts === "unknown" || ts === "error") return "UNKNOWN";
  }

  // 2. Fallback check for business status
  if (["good", "valid", "true", "1", "ok", "deliverable", "yes"].includes(s)) {
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
    ].includes(s)
  ) {
    return "INVALID";
  }

  // "risky" or "catch_all" defaults to UNKNOWN (stays PENDING for verification flow safety)
  return "UNKNOWN";
}
