
/**
 * Official UAE Dirham (AED) Currency Logo:
 * Stylized capital 'D' with two parallel horizontal bars across the stem.
 */
export function DirhamLogo({ className = 'h-[0.88em] w-[0.88em] inline-block align-[-0.08em]' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="UAE Dirham"
      data-testid="aed-dirham-logo"
      className={className}
    >
      {/* Vertical Stem + Curved D Bowl */}
      <path
        d="M6.5 3.75H12.25C16.8063 3.75 20.25 7.19365 20.25 12C20.25 16.8063 16.8063 20.25 12.25 20.25H6.5V3.75Z"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Two Parallel Horizontal Crossbars */}
      <line
        x1="3"
        y1="9.75"
        x2="16.5"
        y2="9.75"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="3"
        y1="14.25"
        x2="16.5"
        y2="14.25"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default DirhamLogo;
