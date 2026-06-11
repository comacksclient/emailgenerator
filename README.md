# EmailGen — Cost-Optimized Email Pipeline

EmailGen is a production Next.js 16 application designed to find and validate email addresses at scale while keeping verifier costs near zero through aggressive database-level deduplication.

This platform operates via a **manual Apify verification flow**—our system does not make outbound API calls to Apify. Instead, you export pending candidates, run them on Apify manually, and import the results back.

---

## The Workflow Journey

1. **Ingest Contacts**: Upload or paste a CSV list containing contact names and domains (e.g. `first_name, last_name, company, domain`).
2. **Generate Candidates**: Generate up to 8 deliverability-ranked email pattern combinations (e.g., `first.last@domain.com`, `f.last@domain.com`).
   * **Deduplication Check**: If an email is already present in the database as `VALID`, `INVALID`, `PENDING`, or `UNKNOWN`, it is skipped. It will never be generated twice.
3. **Export for Verification**: Download the CSV of all `PENDING` email candidates.
4. **Manual Apify Verification**: Upload this CSV to your Apify verifier actor, execute it, and download the output CSV.
5. **Import Results**: Import the Apify CSV back to EmailGen.
   * **VALID** emails are updated and kept permanently.
   * **INVALID** emails are updated to `INVALID` status (retained to prevent future re-generation and save costs).
   * **UNKNOWN** emails stay as `PENDING` to enable retry in future exports.

---

## Environment Configuration

Create a `.env` file in the root directory:

```env
# Supabase Database Connections
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-1-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[ref]:[password]@aws-1-[region].pooler.supabase.com:5432/postgres"

# Authorization (must match)
ADMIN_SECRET="your-secure-backend-password"
NEXT_PUBLIC_ADMIN_SECRET="your-secure-backend-password"
```

---

## Getting Started

### 1. Install Dependencies
```bash
yarn install
```

### 2. Push Schema & Generate Client
```bash
yarn prisma db push
yarn prisma generate
```

### 3. Start Development Server
```bash
yarn dev
```
Open [http://localhost:3000](http://localhost:3000) to access the application dashboard.
