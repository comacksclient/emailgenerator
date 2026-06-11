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

export function parseVerifyResultCSV(csvText: string): Array<{
  email: string;
  status: string;
}> {
  const result = Papa.parse<Record<string, string>>(csvText.trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  return result.data
    .map((row) => ({
      email: (row["email"] || "").trim().toLowerCase(),

      status: (
        row["status"] ||
        row["result"] ||
        row["is_valid"] ||
        row["isvalid"] ||
        row["valid"] ||
        "unknown"
      )
        .trim()
        .toLowerCase(),
    }))
    .filter((r) => r.email.length > 0 && r.email.includes("@"));
}


export function normalizeStatus(
  raw: string
): "VALID" | "INVALID" | "UNKNOWN" {
  const s = raw.toLowerCase().trim();

  if (["valid", "true", "1", "ok", "deliverable", "yes"].includes(s)) {
    return "VALID";
  }

  if (
    [
      "invalid",
      "false",
      "0",
      "undeliverable",
      "no",
      "bad",
      "bounced",
    ].includes(s)
  ) {
    return "INVALID";
  }

  return "UNKNOWN";
}
