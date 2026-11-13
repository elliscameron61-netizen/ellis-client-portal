export function Logo({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const onDark = tone === "light";
  return (
    <span className={`wordmark ${onDark ? "wordmark-light" : ""}`}>
      <svg className="mark" viewBox="0 0 48 48" aria-hidden="true">
        <rect width="48" height="48" rx="12" fill={onDark ? "#12315A" : "#0B1F3A"} />
        <path d="M26.2 7.5 15.2 25.2h8.1L18.8 40.5 34.2 21.2h-8.4L26.2 7.5Z" fill="#3C8DFF" />
      </svg>
      <span>
        Ellis <em>Electrical</em>
      </span>
    </span>
  );
}
