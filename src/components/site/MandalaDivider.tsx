export function MandalaDivider({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 24"
      aria-hidden="true"
      className={`mx-auto h-4 w-40 text-gold ${className}`}
      fill="none"
    >
      <circle cx="100" cy="12" r="4" fill="currentColor" />
      <circle cx="80" cy="12" r="2" fill="currentColor" opacity="0.6" />
      <circle cx="120" cy="12" r="2" fill="currentColor" opacity="0.6" />
      <line x1="0" y1="12" x2="70" y2="12" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <line x1="130" y1="12" x2="200" y2="12" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <circle cx="60" cy="12" r="1.5" fill="currentColor" opacity="0.4" />
      <circle cx="140" cy="12" r="1.5" fill="currentColor" opacity="0.4" />
    </svg>
  );
}
