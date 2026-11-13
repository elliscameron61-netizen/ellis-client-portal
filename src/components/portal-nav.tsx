"use client";

import { usePathname } from "next/navigation";

const links = [
  { href: "/portal", label: "Sites", match: "exact" as const },
  { href: "/portal/certificates", label: "Certificates", match: "prefix" as const },
  { href: "/portal/invoices", label: "Invoices", match: "prefix" as const },
  { href: "/portal/faults", label: "Faults", match: "faults" as const },
];

function current(path: string, href: string, match: "exact" | "prefix" | "faults") {
  if (match === "exact") return path === href;
  if (match === "faults") return path.startsWith("/portal/faults");
  return path.startsWith(href);
}

export function PortalNav({ variant }: { variant: "header" | "bottom" }) {
  const path = usePathname();
  return (
    <nav className={variant === "bottom" ? "bottom-nav" : "desktop-nav"} aria-label="Portal">
      {links.map((link) => (
        <a key={link.href} href={link.href} aria-current={current(path, link.href, link.match) ? "page" : undefined}>
          {link.label}
        </a>
      ))}
      {variant === "bottom" ? (
        <a href="/portal/faults/new" aria-current={path === "/portal/faults/new" ? "page" : undefined}>
          Log fault
        </a>
      ) : null}
    </nav>
  );
}
