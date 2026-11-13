import { Logo } from "@/components/logo";

export default function NotFound() {
  return (
    <main className="page" id="main">
      <Logo />
      <h1>Page not found</h1>
      <p className="lede">That page is not in the portal.</p>
      <p>
        <a className="btn btn-primary" href="/">
          Back to sign in
        </a>
      </p>
    </main>
  );
}
