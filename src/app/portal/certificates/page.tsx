import { Empty } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { listCertificates } from "@/server/portal-data";
import { requireClientActor } from "@/server/session";

export const metadata = { title: "Certificates" };

export default async function CertificatesPage() {
  const actor = await requireClientActor();
  const certificates = await listCertificates(actor);
  return (
    <main className="page" id="main">
      <h1>Certificates</h1>
      <p className="lede">Compliance certificates Ellis Electrical has attached for your organisation.</p>
      {certificates.length === 0 ? (
        <Empty title="No certificates yet" body="When a certificate is added to one of your jobs, the download will appear here." />
      ) : (
        <div className="job-list">
          {certificates.map((certificate) => {
            const file = certificate.attachments[0];
            const overdue = certificate.expiresAt ? certificate.expiresAt.getTime() < Date.now() : false;
            return (
              <article className="job-row" key={certificate.id}>
                <header>
                  <strong>{certificate.number ?? certificate.title}</strong>
                  <span>{certificate.type}</span>
                </header>
                <p>
                  {certificate.site?.name ?? "Site not recorded"}
                  {certificate.job?.externalRef ? ` · Job ${certificate.job.externalRef}` : ""}
                </p>
                <p className="muted">
                  Issued {formatDate(certificate.issuedAt)} · Next due {formatDate(certificate.expiresAt)}
                  {overdue ? " · overdue" : ""}
                </p>
                {file ? (
                  <p>
                    <a className="btn btn-primary btn-small" href={`/api/files/${file.id}`}>
                      Download
                    </a>
                  </p>
                ) : (
                  <p className="muted">The certificate is on file, but the PDF has not been attached yet.</p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
