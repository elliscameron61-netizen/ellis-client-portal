import { describe, expect, it } from "vitest";
import { deriveInvoiceStatus, parseDate, parseInvoiceCsv, parseJobCsv, parseMoneyToCents } from "@/lib/csv";

describe("csv parsing", () => {
  it("reads South African dates and rand amounts", () => {
    const date = parseDate("02/10/2026");
    expect(date?.getUTCMonth()).toBe(9);
    expect(date?.getUTCDate()).toBe(2);
    expect(parseDate("2026-11-18")?.getUTCFullYear()).toBe(2026);
    expect(parseDate("31/02/2026")).toBeNull();
    expect(parseMoneyToCents("R 1 250.00")).toBe(125000);
    expect(parseMoneyToCents("1,250.50")).toBe(125050);
    expect(parseMoneyToCents("625.25")).toBe(62525);
  });

  it("keeps a job row when the job number is missing", () => {
    const parsed = parseJobCsv(
      [
        "Job Number,Customer,Site Name,Description,Scheduled Date",
        ",Example Property Management,Example Heights,Replace a fitting,02/11/2026",
      ].join("\n"),
    );
    expect(parsed.errors).toEqual([]);
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0].jobNumber).toBeNull();
    expect(parsed.rows[0].importKey).toMatch(/^[a-f0-9]{32}$/);
  });

  it("derives invoice status from the balance and due date", () => {
    const now = new Date("2026-11-13T12:00:00Z");
    expect(
      deriveInvoiceStatus({ status: "", totalCents: 1000, balanceCents: 0, dueAt: null, now }),
    ).toBe("Paid");
    expect(
      deriveInvoiceStatus({
        status: "",
        totalCents: 1000,
        balanceCents: 400,
        dueAt: new Date("2026-10-01T12:00:00Z"),
        now,
      }),
    ).toBe("Overdue");
    expect(
      deriveInvoiceStatus({
        status: "",
        totalCents: 1000,
        balanceCents: 400,
        dueAt: new Date("2026-12-01T12:00:00Z"),
        now,
      }),
    ).toBe("Part paid");
  });

  it("reports a row that has no invoice number", () => {
    const parsed = parseInvoiceCsv("Invoice Number,Customer,Total\n,Example Hotel Group,100.00\n");
    expect(parsed.rows).toHaveLength(0);
    expect(parsed.errors[0]?.message).toMatch(/Invoice Number/);
  });
});
