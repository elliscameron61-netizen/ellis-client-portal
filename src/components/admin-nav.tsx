"use client";

import { usePathname } from "next/navigation";
import { logoutAction } from "@/server/actions/auth";

const links = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/organisations", label: "Clients" },
  { href: "/admin/users", label: "People" },
  { href: "/admin/jobs", label: "Jobs" },
  { href: "/admin/invoices", label: "Invoices" },
  { href: "/admin/import", label: "Import" },
  { href: "/admin/faults", label: "Faults" },
  { href: "/admin/messages", label: "Messages" },
];

export function AdminNav() {
  const path = usePathname();
  return (
    <nav className="side-nav" aria-label="Staff">
      {links.map((link) => {
        const current = link.href === "/admin" ? path === "/admin" : path.startsWith(link.href);
        return (
          <a key={link.href} href={link.href} aria-current={current ? "page" : undefined}>
            {link.label}
          </a>
        );
      })}
      <form action={logoutAction} className="signout">
        <button type="submit">Sign out</button>
      </form>
    </nav>
  );
}
