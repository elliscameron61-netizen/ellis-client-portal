import { createHash } from "crypto";
import Papa from "papaparse";

export type ImportIssue = { row: number; message: string };

export type JobCsvRow = {
  row: number;
  jobNumber: string | null;
  customer: string;
  siteName: string | null;
  siteAddress: string | null;
  title: string;
  description: string | null;
  status: string;
  scheduledAt: Date | null;
  completedAt: Date | null;
  team: string | null;
  importKey: string | null;
};

export type InvoiceCsvRow = {
  row: number;
  invoiceNumber: string;
  customer: string;
  issuedAt: Date | null;
  dueAt: Date | null;
  totalCents: number;
  balanceCents: number;
  status: string;
  jobNumber: string | null;
  memo: string | null;
};

const JOB_ALIASES: Record<string, string> = {
  "job number": "jobNumber",
  "job no": "jobNumber",
  "job no.": "jobNumber",
  "job #": "jobNumber",
  "job#": "jobNumber",
  jobnumber: "jobNumber",
  reference: "reference",
  customer: "customer",
  "customer name": "customer",
  client: "customer",
  "site name": "siteName",
  site: "siteName",
  location: "siteName",
  "site address": "siteAddress",
  address: "siteAddress",
  title: "title",
  "job title": "title",
  description: "description",
  "job description": "description",
  details: "description",
  status: "status",
  "job status": "status",
  "scheduled date": "scheduledDate",
  scheduled: "scheduledDate",
  "start date": "scheduledDate",
  date: "scheduledDate",
  "completed date": "completedDate",
  completed: "completedDate",
  "completion date": "completedDate",
  "assigned team": "team",
  team: "team",
  "assigned to": "team",
  staff: "team",
  category: "category",
};

const INVOICE_ALIASES: Record<string, string> = {
  "invoice number": "invoiceNumber",
  "invoice no": "invoiceNumber",
  "invoice no.": "invoiceNumber",
  "invoice #": "invoiceNumber",
  "invoice#": "invoiceNumber",
  num: "invoiceNumber",
  "doc number": "invoiceNumber",
  "document number": "invoiceNumber",
  customer: "customer",
  "customer name": "customer",
  name: "customer",
  "invoice date": "invoiceDate",
  date: "invoiceDate",
  "due date": "dueDate",
  total: "total",
  amount: "total",
  "total amount": "total",
  balance: "balance",
  "open balance": "balance",
  "balance due": "balance",
  status: "status",
  "job number": "jobNumber",
  "job no": "jobNumber",
  "job #": "jobNumber",
  memo: "memo",
  description: "memo",
  "memo/description": "memo",
};

export const JOB_COLUMN_GUIDE = [
  ["Job Number", "No", "Stored as the job number. Leave the cell blank when Tradify has no number."],
  ["Customer", "Yes", "Matched to an existing client organisation name. Unknown names are skipped."],
  ["Site Name", "No", "Matched within that client, or created when it does not exist yet."],
  ["Site Address", "No", "Used when a site is created. Existing sites keep their address."],
  ["Description", "Yes", "Job description. The first line is used as the title when Title is empty."],
  ["Title", "No", "Short title. Falls back to Description."],
  ["Status", "No", "Free text such as Scheduled, In progress, Completed. Defaults to Scheduled."],
  ["Scheduled Date", "No", "YYYY-MM-DD or DD/MM/YYYY."],
  ["Completed Date", "No", "YYYY-MM-DD or DD/MM/YYYY."],
  ["Assigned Team", "No", "Shown as the team on the job."],
  ["Category", "No", "Appended to the description when present."],
] as const;

export const INVOICE_COLUMN_GUIDE = [
  ["Invoice Number", "Yes", "QuickBooks document number. Re-importing the same number updates that invoice."],
  ["Customer", "Yes", "Matched to an existing client organisation name."],
  ["Invoice Date", "No", "YYYY-MM-DD or DD/MM/YYYY."],
  ["Due Date", "No", "Used when the status cell is empty and the balance is still outstanding."],
  ["Total", "Yes", "Rand amount. R 1 250.00, 1250.00 and 1,250.50 are accepted."],
  ["Balance", "No", "Outstanding balance. Defaults to the total when the cell is empty."],
  ["Status", "No", "Paid, Open, Overdue, Part paid or Void. Derived from the balance and due date when empty."],
  ["Job Number", "No", "Linked to a job in the same organisation when the number matches. A missing number is allowed."],
  ["Memo", "No", "Short description shown next to the invoice."],
] as const;

export function buildImportKey(parts: Array<string | null | undefined>): string {
  const normalised = parts.map((part) => (part ?? "").trim().toLowerCase().replace(/\s+/g, " ")).join("|");
  return createHash("sha256").update(normalised).digest("hex").slice(0, 32);
}

export function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const raw = value.trim();
  if (!raw) return null;

  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    return dateOrNull(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  }

  const local = raw.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (local) {
    return dateOrNull(Number(local[3]), Number(local[2]), Number(local[1]));
  }

  return null;
}

function dateOrNull(year: number, month: number, day: number): Date | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }
  return date;
}

export function parseMoneyToCents(value: string | null | undefined): number | null {
  if (value == null) return null;
  let raw = value.trim();
  if (!raw) return null;
  const negative = /^\(.*\)$/.test(raw) || raw.startsWith("-");
  raw = raw.replace(/[()]/g, "");
  raw = raw.replace(/[Rr\s]/g, "");
  raw = raw.replace(/zar/i, "");

  if (raw.includes(",") && raw.includes(".")) {
    if (raw.lastIndexOf(",") > raw.lastIndexOf(".")) {
      raw = raw.replace(/\./g, "").replace(",", ".");
    } else {
      raw = raw.replace(/,/g, "");
    }
  } else if (raw.includes(",")) {
    const parts = raw.split(",");
    if (parts.length === 2 && parts[1].length <= 2) {
      raw = `${parts[0].replace(/\./g, "")}.${parts[1]}`;
    } else {
      raw = raw.replace(/,/g, "");
    }
  }

  if (!/^\d+(\.\d+)?$/.test(raw)) return null;
  const amount = Number(raw);
  if (!Number.isFinite(amount)) return null;
  const cents = Math.round(amount * 100);
  return negative ? -cents : cents;
}

export function deriveInvoiceStatus(input: {
  status?: string | null;
  totalCents: number;
  balanceCents: number;
  dueAt: Date | null;
  now?: Date;
}): string {
  const now = input.now ?? new Date();
  const raw = (input.status ?? "").trim().toLowerCase();
  if (raw.includes("void")) return "Void";
  if (raw.includes("credit")) return "Credit";
  if ((raw === "paid" || raw.includes("paid in full")) && !raw.includes("unpaid") && !raw.includes("part")) {
    return "Paid";
  }
  if (input.totalCents < 0) return "Credit";
  if (input.balanceCents <= 0) return "Paid";
  if (input.dueAt && input.dueAt.getTime() < now.getTime()) return "Overdue";
  if (raw.includes("part") || (input.balanceCents > 0 && input.balanceCents < input.totalCents)) {
    return "Part paid";
  }
  return "Open";
}

function blankToNull(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

function mapRecord(record: Record<string, string>, aliases: Record<string, string>): Record<string, string> {
  const mapped: Record<string, string> = {};
  for (const [header, value] of Object.entries(record)) {
    const key = aliases[header.trim().toLowerCase()];
    if (!key || mapped[key]) continue;
    mapped[key] = value ?? "";
  }
  return mapped;
}

function parseCsv(text: string): { rows: Record<string, string>[]; errors: ImportIssue[] } {
  const cleaned = text.replace(/^\uFEFF/, "");
  const parsed = Papa.parse<Record<string, string>>(cleaned, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (header) => header.trim(),
  });
  const errors: ImportIssue[] = parsed.errors
    .filter((error) => error.type !== "FieldMismatch")
    .map((error) => ({
      row: error.row != null ? error.row + 1 : 0,
      message: error.message,
    }));
  return { rows: parsed.data, errors };
}

export function parseJobCsv(text: string): { rows: JobCsvRow[]; errors: ImportIssue[] } {
  const parsed = parseCsv(text);
  const rows: JobCsvRow[] = [];

  parsed.rows.forEach((record, index) => {
    const rowNumber = index + 2;
    const mapped = mapRecord(record, JOB_ALIASES);
    if (Object.values(mapped).every((value) => !value?.trim())) return;

    const customer = blankToNull(mapped.customer);
    const description = blankToNull(mapped.description);
    const title = blankToNull(mapped.title) ?? (description ? description.split("\n")[0].slice(0, 140) : null);
    if (!customer) {
      parsed.errors.push({ row: rowNumber, message: "Customer is required." });
      return;
    }
    if (!title) {
      parsed.errors.push({ row: rowNumber, message: "Description or Title is required." });
      return;
    }

    const scheduledRaw = blankToNull(mapped.scheduledDate);
    const completedRaw = blankToNull(mapped.completedDate);
    const scheduledAt = parseDate(scheduledRaw);
    const completedAt = parseDate(completedRaw);
    if (scheduledRaw && !scheduledAt) {
      parsed.errors.push({ row: rowNumber, message: `Could not read scheduled date "${scheduledRaw}". Use YYYY-MM-DD or DD/MM/YYYY.` });
      return;
    }
    if (completedRaw && !completedAt) {
      parsed.errors.push({ row: rowNumber, message: `Could not read completed date "${completedRaw}". Use YYYY-MM-DD or DD/MM/YYYY.` });
      return;
    }

    const category = blankToNull(mapped.category);
    let fullDescription = description;
    if (category) {
      const line = `Category: ${category}`;
      fullDescription = fullDescription ? `${fullDescription}\n${line}` : line;
    }

    const jobNumber = blankToNull(mapped.jobNumber) ?? blankToNull(mapped.reference);
    const siteName = blankToNull(mapped.siteName);
    const importKey = jobNumber
      ? null
      : buildImportKey([customer, siteName, title, scheduledRaw]);

    rows.push({
      row: rowNumber,
      jobNumber,
      customer,
      siteName,
      siteAddress: blankToNull(mapped.siteAddress),
      title,
      description: fullDescription,
      status: blankToNull(mapped.status) ?? "Scheduled",
      scheduledAt,
      completedAt,
      team: blankToNull(mapped.team),
      importKey,
    });
  });

  return { rows, errors: parsed.errors };
}

export function parseInvoiceCsv(text: string, now = new Date()): { rows: InvoiceCsvRow[]; errors: ImportIssue[] } {
  const parsed = parseCsv(text);
  const rows: InvoiceCsvRow[] = [];

  parsed.rows.forEach((record, index) => {
    const rowNumber = index + 2;
    const mapped = mapRecord(record, INVOICE_ALIASES);
    if (Object.values(mapped).every((value) => !value?.trim())) return;

    const invoiceNumber = blankToNull(mapped.invoiceNumber);
    const customer = blankToNull(mapped.customer);
    if (!invoiceNumber) {
      parsed.errors.push({ row: rowNumber, message: "Invoice Number is required." });
      return;
    }
    if (!customer) {
      parsed.errors.push({ row: rowNumber, message: "Customer is required." });
      return;
    }

    const totalRaw = blankToNull(mapped.total);
    const totalCents = parseMoneyToCents(totalRaw);
    if (totalCents == null) {
      parsed.errors.push({ row: rowNumber, message: "Total is required and must be a rand amount." });
      return;
    }
    const balanceRaw = blankToNull(mapped.balance);
    const balanceCents = balanceRaw == null ? totalCents : parseMoneyToCents(balanceRaw);
    if (balanceCents == null) {
      parsed.errors.push({ row: rowNumber, message: `Could not read balance "${balanceRaw}".` });
      return;
    }

    const issuedRaw = blankToNull(mapped.invoiceDate);
    const dueRaw = blankToNull(mapped.dueDate);
    const issuedAt = parseDate(issuedRaw);
    const dueAt = parseDate(dueRaw);
    if (issuedRaw && !issuedAt) {
      parsed.errors.push({ row: rowNumber, message: `Could not read invoice date "${issuedRaw}".` });
      return;
    }
    if (dueRaw && !dueAt) {
      parsed.errors.push({ row: rowNumber, message: `Could not read due date "${dueRaw}".` });
      return;
    }

    rows.push({
      row: rowNumber,
      invoiceNumber,
      customer,
      issuedAt,
      dueAt,
      totalCents,
      balanceCents,
      status: deriveInvoiceStatus({
        status: blankToNull(mapped.status),
        totalCents,
        balanceCents,
        dueAt,
        now,
      }),
      jobNumber: blankToNull(mapped.jobNumber),
      memo: blankToNull(mapped.memo),
    });
  });

  return { rows, errors: parsed.errors };
}
