// Sitewide decorative backdrop: a single fixed layer behind every public
// page, so the motif holds still while the content scrolls over it. Header
// and footer paint opaque colours of their own, so the backdrop reads only
// behind the content column — that framing is the point.
//
// Deliberately a Server Component with no interactivity and no images: it
// ships zero JS and zero network requests, which matters on the low-end
// mobile connections that make up most of this shop's traffic. Everything
// here is geometry and gradients.
//
// Everything is kept very low-contrast on purpose. This sits underneath body
// text sitewide, so it must never eat into the WCAG AA contrast the palette
// already gives us — it should register as warmth and texture, not as a
// picture competing with product photography.

const PETAL_COUNT = 16;
const OUTER_DOT_COUNT = 24;

// One mandala, drawn once and reused at two sizes/positions below.
function Mandala({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 200 200" fill="none" aria-hidden="true" className={className}>
      <circle cx="100" cy="100" r="10" fill="currentColor" />
      <circle cx="100" cy="100" r="22" stroke="currentColor" strokeWidth="0.75" />
      <circle cx="100" cy="100" r="62" stroke="currentColor" strokeWidth="0.75" />
      <circle cx="100" cy="100" r="88" stroke="currentColor" strokeWidth="0.5" />

      {/* Lotus petals — an ellipse rotated into place around the centre. */}
      {Array.from({ length: PETAL_COUNT }, (_, i) => (
        <ellipse
          key={`petal-${i}`}
          cx="100"
          cy="58"
          rx="7"
          ry="26"
          stroke="currentColor"
          strokeWidth="0.75"
          transform={`rotate(${(360 / PETAL_COUNT) * i} 100 100)`}
        />
      ))}

      {/* Beaded outer ring. */}
      {Array.from({ length: OUTER_DOT_COUNT }, (_, i) => (
        <circle
          key={`dot-${i}`}
          cx="100"
          cy="12"
          r="1.75"
          fill="currentColor"
          transform={`rotate(${(360 / OUTER_DOT_COUNT) * i} 100 100)`}
        />
      ))}
    </svg>
  );
}

export function SiteBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-cream"
    >
      {/* Warm vertical wash — lightest at the top where the header meets it,
          deepening toward the footer so the page has a sense of ground. */}
      <div className="absolute inset-0 bg-gradient-to-b from-cream via-cream to-cream-dark/60" />

      {/* Two soft off-centre glows in terracotta and gold. Kept well away
          from the centre column so they fall behind the page margins rather
          than behind paragraphs of text. */}
      <div className="absolute -left-40 top-[-10%] h-[45rem] w-[45rem] rounded-full bg-[radial-gradient(circle,var(--color-terracotta)_0%,transparent_68%)] opacity-[0.07]" />
      <div className="absolute -right-48 bottom-[-15%] h-[50rem] w-[50rem] rounded-full bg-[radial-gradient(circle,var(--color-gold)_0%,transparent_70%)] opacity-[0.09]" />

      {/* Repeating diamond lattice, the quietest layer — reads as woven
          texture rather than as a discernible motif. */}
      <svg className="absolute inset-0 h-full w-full text-maroon" aria-hidden="true">
        <defs>
          <pattern
            id="backdrop-lattice"
            width="56"
            height="56"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M28 6 L50 28 L28 50 L6 28 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.75"
            />
            <circle cx="28" cy="28" r="1.5" fill="currentColor" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#backdrop-lattice)" opacity="0.05" />
      </svg>

      {/* Two mandalas bleeding off opposite edges, so the pattern feels like
          a much larger design the viewport is cropping into. */}
      <Mandala className="absolute -left-28 top-16 h-[26rem] w-[26rem] text-maroon opacity-[0.06] sm:-left-20 sm:h-[32rem] sm:w-[32rem]" />
      <Mandala className="absolute -right-32 bottom-[-6rem] h-[30rem] w-[30rem] text-terracotta opacity-[0.05] sm:-right-24 sm:h-[38rem] sm:w-[38rem]" />
    </div>
  );
}
