import { Logo } from "@/components/logo";
import { AdminNav } from "@/components/admin-nav";
import { requireAdminActor } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const actor = await requireAdminActor();
  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <Logo tone="light" />
        <AdminNav />
        <p className="sidebar-user">
          {actor.name}
          <br />
          Ellis staff
        </p>
      </aside>
      <div className="content">{children}</div>
    </div>
  );
}
