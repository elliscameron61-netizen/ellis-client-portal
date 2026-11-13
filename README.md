# Ellis Electrical client portal

Invite-only portal for Ellis Electrical, a Johannesburg electrical contractor. Ellis staff create client organisations and invite users. A client signs in and sees only that organisation’s sites, jobs, certificates and invoices.

Tradify remains the system of record for jobs. QuickBooks Online remains the system of record for invoices. This app stores a copy for clients, plus portal-only notes, photos, documents, video links and fault requests.

The repository is safe to make public. Seed data is fictional (`Example Property Management`, `@example` and `.test` addresses). Do not commit real client exports or passwords.

## Stack

- Next.js (App Router) and React
- PostgreSQL with Prisma
- Email + password sessions, magic links and password reset
- Vitest for auth and tenant-isolation tests

Files are stored in Postgres so a host with no persistent disk (such as Vercel) can still serve certificates and photos. The 8 MB limit is intentional.

## Local setup

Requirements: Node.js 20+, PostgreSQL 16.

With Docker:

```bash
docker compose up -d
```

Without Docker, create the same role and databases:

```bash
sudo -u postgres psql -c "CREATE ROLE ellis LOGIN PASSWORD 'ellis' SUPERUSER;"
sudo -u postgres createdb -O ellis ellis_portal
sudo -u postgres createdb -O ellis ellis_portal_test
```

Then:

```bash
cp .env.example .env
npm install
npm run setup
npm run dev
```

Open http://localhost:3000.

`npm run setup` applies migrations and loads the fictional seed. Development logins (change them before any shared deployment):

| Who | Email | Password |
| --- | --- | --- |
| Ellis admin | `dev-admin@elliselectrical.example` | `Example-Admin-2026!` |
| Example Property Management | `alex.example@example-property.test` | `Example-Client-2026!` |
| Example Hotel Group | `sam.example@example-hotel.test` | `Example-Client-2026!` |

`Example Body Corporate` is in the seed with portal access turned off, so you can switch access on from the client page.

In local development, with `SHOW_DEV_LINKS=true`, sign-in and password links are also shown on screen. That flag is ignored when `NODE_ENV=production`.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the app |
| `npm run setup` | Migrate and seed example data |
| `npm test` | Auth, tenant isolation and CSV tests |
| `npm run lint` | Typecheck |
| `npm run build` | Production build |
| `npm run admin:create` | Create one real Ellis admin (see below) |

## Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string |
| `TEST_DATABASE_URL` | Separate database for `npm test` |
| `APP_URL` | Public URL used in email links |
| `EMAIL_FROM` | From address when SMTP is set. Defaults to Ellis Electrical `<info@elliselectrical.co.za>` |
| `NOTIFY_EMAIL` | Optional extra address for fault emails, as well as every active admin |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE` | Optional. When unset, messages are stored and shown under Admin → Messages |
| `SHOW_DEV_LINKS` | Show magic-link and reset URLs on screen in development |
| `SEED_ADMIN_PASSWORD`, `SEED_CLIENT_PASSWORD` | Override the example seed passwords |
| `ADMIN_EMAIL`, `ADMIN_NAME`, `ADMIN_PASSWORD` | Used only by `npm run admin:create` |

Contact shown in the product: **info@elliselectrical.co.za**.

## What you can do

Ellis staff (`/admin`):

- Create a client organisation and its sites
- Turn portal access on or off per client
- Invite a client user or another staff member, and disable an account
- Import Tradify job and QuickBooks invoice CSVs
- Open a job and add a client note or a staff-only note, a photo, a document, a certificate PDF, a how-to video link and an FAQ
- Read the fault queue. New requests are emailed to active admins

Clients (`/portal`), mobile-first:

- Sites, with open jobs, last visit and next certificate date when one is on file
- Job history and job detail, including technician notes, photos, documents, video links and FAQ
- Certificates, with download
- Invoices, with status and outstanding balance
- Log a fault (site, description, photos, priority)

A client session is loaded from the database on each request. Queries for client users always use that organisation id. Passing another organisation id from the browser does not widen the query. Staff-only notes are omitted from the client job page.

## CSV import formats

Sample files:

- `samples/tradify-jobs.sample.csv`
- `samples/quickbooks-invoices.sample.csv`

Create the client organisation before importing. The Customer cell must match the organisation name (case is ignored). Unknown customers are skipped and reported. Importing the same job number or invoice number again updates that row and does not remove notes, photos or videos.

Dates accept `YYYY-MM-DD` and `DD/MM/YYYY`. Amounts are South African rand (`R 1 250.00`, `1250.00`, `1,250.50`).

Header names are matched loosely. `Job No`, `Job #`, `Customer Name`, `Location`, `Assigned To`, `Invoice No`, `Open Balance` and `Memo/Description` are accepted aliases of the columns below.

### Jobs (Tradify-style)

| Column | Required | Maps to |
| --- | --- | --- |
| Job Number | No | Job number. Leave the cell blank when Tradify has no number. |
| Customer | Yes | Existing client organisation. |
| Site Name | No | Site within that client. Created if it does not exist yet. |
| Site Address | No | Address used when a site is created. |
| Description | Yes | Description. The first line is the title when Title is empty. |
| Title | No | Short title. |
| Status | No | Free text such as Scheduled, In progress, Completed. Defaults to Scheduled. |
| Scheduled Date | No | Scheduled date. |
| Completed Date | No | Completed date. |
| Assigned Team | No | Team shown on the job. |
| Category | No | Appended to the description. |

A row with no job number is stored and matched on a later import by customer, site, title and scheduled date. A blank job number does not attach the row to some other job.

### Invoices (QuickBooks-style)

| Column | Required | Maps to |
| --- | --- | --- |
| Invoice Number | Yes | Invoice number. Re-import updates that invoice. |
| Customer | Yes | Existing client organisation. |
| Invoice Date | No | Issue date. |
| Due Date | No | Used when status is derived. |
| Total | Yes | Rand amount. |
| Balance | No | Outstanding balance. Defaults to the total. |
| Status | No | Paid, Open, Overdue, Part paid or Void. If the cell is empty, status comes from the balance and due date. |
| Job Number | No | Linked to a job in the **same** organisation when the number matches. A missing number is allowed. |
| Memo | No | Description shown beside the invoice. |

## Tests

```bash
npm test
```

The suite uses `ellis_portal_test`, not the development database. It covers password sign-in, disabled accounts, portal access turned off, single-use magic links, password reset, invites, and server-side checks that one client cannot read another client’s jobs, invoices, certificates, files or sites. It also imports the sample CSVs, including a row with no job number.

## Deploy

A small Postgres database plus a Node host is enough. Vercel and Neon, or any similar pair, fit.

1. Create a Postgres database and set `DATABASE_URL`.
2. Set `APP_URL` to the public https URL.
3. Leave `SHOW_DEV_LINKS` unset.
4. Set SMTP variables so fault emails and invites actually leave the server. Until you do, messages are only stored in the database.
5. Build command: `prisma generate && prisma migrate deploy && next build`.
6. Do **not** run `npm run setup` in production. That seed is example data.
7. Create the first staff account once:

```bash
ADMIN_EMAIL="you@elliselectrical.co.za" \
ADMIN_NAME="Your Name" \
ADMIN_PASSWORD="a strong password" \
npm run admin:create
```

8. Sign in, create real client organisations, and invite users. Turn portal access on only for organisations that should sign in.

Uploaded files live in the database (8 MB each). If the photo library grows, replace `saveStoredFile` and `readStoredFile` in `src/server/storage.ts` with object storage and keep the attachment records.

The portal sends `X-Frame-Options`, `nosniff` and a same-site session cookie. Use HTTPS in production so the cookie is marked secure.

## Connect Tradify and QuickBooks later

Keep both products as the systems of record. This portal should keep displaying a copy.

A later sync job can:

1. Pull jobs from Tradify (their API, on plans that include it, or the same CSV export).
2. Pull invoices from the QuickBooks Online Accounting API (OAuth 2.0, per company).
3. Map the fields onto the columns above.
4. Upsert jobs by organisation + job number, and invoices by organisation + invoice number. Rows that still have no job number keep using the customer / site / title / date key.
5. Leave portal-only data alone: technician notes, photos, certificate files, video links, FAQs and fault requests.

Do not edit invoice balances in this app. When a payment is recorded in QuickBooks, the next import updates the balance and status.

Fault requests are only stored and emailed today. A later step can create a matching Tradify job from a request. Email sending goes through `notify()` in `src/server/notifications.ts`. WhatsApp or SMS can be added by implementing `MessageChannel` and registering it in `getChannels()`; the fault and invite call sites do not need to change.

## Roles

- **Ellis admin** — all organisations.
- **Client user** — one organisation, and only when that organisation’s portal access is on.

There is no public self-registration.
