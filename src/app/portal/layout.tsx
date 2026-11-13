import { Logo } from "@/components/logo";
import { PortalNav } from "@/components/portal-nav";
import { logoutAction } from "@/server/actions/auth";
import { requireClientActor } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const actor = await requireClientActor();
  return (
    <div className="portal-shell">
      <header className="portal-header">
        <div className="portal-header-row">
          <div>
            <Logo tone="light" />
            <p className="who">
              {actor.name}
              {actor.organisationName ? ` · ${actor.organisationName}` : ""}
            </p>
          </div>
          <div className="header-tools">
            <PortalNav variant="header" />
            <form action={logoutAction} className="header-signout">
              <button type="submit">Sign out</button>
            </form>
          </div>
        </div>
      </header>
      {children}
      <PortalNav variant="bottom" />
    </div>
  );
}
