// Ring + centered percentage, used wherever an upload is in flight
// (ImageUploadField, VideoUploadField). Size drives both the SVG and the
// label's readability — below ~24px the percentage text is dropped since it
// no longer fits legibly.
export function CircularProgress({
  value,
  size = 32,
  strokeWidth = 3,
  className = "",
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  const clamped = Math.min(100, Math.max(0, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className={`relative inline-flex shrink-0 items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className="fill-none stroke-maroon/15"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="fill-none stroke-terracotta transition-[stroke-dashoffset] duration-150 ease-out"
        />
      </svg>
      {size >= 24 && (
        <span className="absolute text-[9px] font-semibold text-charcoal">{clamped}%</span>
      )}
    </div>
  );
}
