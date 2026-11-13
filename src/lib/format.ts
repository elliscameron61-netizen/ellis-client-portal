const CLOSED_JOB_STATUSES = new Set([
  "completed",
  "complete",
  "cancelled",
  "canceled",
  "closed",
  "invoiced",
]);

export function isOpenJob(status: string): boolean {
  return !CLOSED_JOB_STATUSES.has(status.trim().toLowerCase());
}

export function jobNumberLabel(externalRef: string | null | undefined): string {
  return externalRef?.trim() ? externalRef : "No job number";
}

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Johannesburg",
  }).format(date);
}

export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Johannesburg",
  }).format(date);
}

export function formatMoney(cents: number, currency = "ZAR"): string {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

export function statusTone(status: string): "open" | "done" | "hold" | "neutral" {
  const value = status.trim().toLowerCase();
  if (["completed", "complete", "paid", "closed", "acknowledged"].includes(value)) return "done";
  if (["cancelled", "canceled", "void"].includes(value)) return "neutral";
  if (["on hold", "overdue", "high", "part paid"].includes(value)) return "hold";
  return "open";
}

export function priorityLabel(priority: string): string {
  switch (priority) {
    case "LOW":
      return "Low";
    case "HIGH":
      return "High";
    default:
      return "Normal";
  }
}

export function faultStatusLabel(status: string): string {
  switch (status) {
    case "ACKNOWLEDGED":
      return "Acknowledged";
    case "CLOSED":
      return "Closed";
    default:
      return "New";
  }
}

export function safeFilename(name: string): string {
  const base = name.split(/[/\\]/).pop() || "file";
  const cleaned = base.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^\.+/, "").slice(0, 120);
  return cleaned || "file";
}

export function redactLinks(text: string): string {
  return text.replace(/https?:\/\/\S+/g, "[link hidden]");
}
