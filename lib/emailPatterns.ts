export interface GeneratedEmail {
  email: string;
  pattern: string;
  patternRank: number;
  domain: string;
}


export function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}


export function normalizeDomain(d: string): string {
  return d
    .toLowerCase()
    .trim()
    .replace(/^@/, "")
    .replace(/\/$/, "");
}


const PATTERNS = [
  {
    label: "first.last",
    rank: 1,
    fn: (f: string, l: string) => `${f}.${l}`,
  },
  {
    label: "f.last",
    rank: 2,
    fn: (f: string, l: string) => `${f[0]}.${l}`,
  },
  {
    label: "flast",
    rank: 3,
    fn: (f: string, l: string) => `${f[0]}${l}`,
  },
  {
    label: "firstlast",
    rank: 4,
    fn: (f: string, l: string) => `${f}${l}`,
  },
  {
    label: "first",
    rank: 5,
    fn: (f: string, _l: string) => `${f}`,
  },
  {
    label: "last.first",
    rank: 6,
    fn: (f: string, l: string) => `${l}.${f}`,
  },
  {
    label: "first.l",
    rank: 7,
    fn: (f: string, l: string) => `${f}.${l[0]}`,
  },
  {
    label: "first_last",
    rank: 8,
    fn: (f: string, l: string) => `${f}_${l}`,
  },
] as const;

export function generateEmailsForContact(
  firstName: string,
  lastName: string,
  domain: string,
  maxPatterns = 7
): GeneratedEmail[] {
  const f = normalizeName(firstName);
  const l = normalizeName(lastName);
  const d = normalizeDomain(domain);


  if (!f || !l || !d || !d.includes(".")) return [];

  const count = Math.min(Math.max(maxPatterns, 1), 8);

  return PATTERNS.slice(0, count).map((p) => ({
    email: `${p.fn(f, l)}@${d}`,
    pattern: p.label,
    patternRank: p.rank,
    domain: d,
  }));
}
