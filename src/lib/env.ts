export function appUrl(): string {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function showDevLinks(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.SHOW_DEV_LINKS === "true";
}

export function emailFrom(): string {
  return process.env.EMAIL_FROM || "Ellis Electrical <info@elliselectrical.co.za>";
}

export const CONTACT_EMAIL = "info@elliselectrical.co.za";
