"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="page" id="main">
      <h1>Something went wrong</h1>
      <p>Reload the page. If it keeps happening, email info@elliselectrical.co.za.</p>
      <button className="btn btn-primary" type="button" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
