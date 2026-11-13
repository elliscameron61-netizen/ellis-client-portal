import { formatDateTime, redactLinks } from "@/lib/format";
import { showDevLinks } from "@/lib/env";
import { listMessages } from "@/server/portal-data";
import { requireAdminActor } from "@/server/session";

export const metadata = { title: "Messages" };

export default async function MessagesPage() {
  const actor = await requireAdminActor();
  const messages = await listMessages(actor);
  const dev = showDevLinks();
  return (
    <main className="page" id="main">
      <h1>Messages</h1>
      <p className="lede">
        Email is sent when SMTP is configured. Otherwise the message is kept here. WhatsApp and SMS are not
        connected yet; the notification code has a channel interface for them.
      </p>
      {messages.length === 0 ? <p className="muted">No messages yet.</p> : null}
      {messages.map((message) => (
        <article className="panel" key={message.id}>
          <header className="split">
            <strong>{message.subject}</strong>
            <span className="muted">{formatDateTime(message.createdAt)}</span>
          </header>
          <p className="muted">
            {message.channel} · {message.toAddress}
            {message.error ? ` · ${message.error}` : ""}
          </p>
          <pre className="message-body">{dev ? message.body : redactLinks(message.body)}</pre>
        </article>
      ))}
    </main>
  );
}
