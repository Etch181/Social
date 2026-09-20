/** FOX AI SOCIAL brand mark — hand-drawn geometric fox with luminous eyes. */
export function FoxMark({
  size = 40,
  className = "",
  mono = false,
}: {
  size?: number;
  className?: string;
  mono?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      fill="none"
      className={className}
      role="img"
      aria-label="FOX AI SOCIAL"
    >
      <defs>
        <linearGradient id="foxGrad" x1="12" y1="8" x2="116" y2="122" gradientUnits="userSpaceOnUse">
          <stop stopColor={mono ? "currentColor" : "#B39CFF"} />
          <stop offset="0.52" stopColor={mono ? "currentColor" : "#7C4DFF"} />
          <stop offset="1" stopColor={mono ? "currentColor" : "#2E7BFF"} />
        </linearGradient>
        <linearGradient id="foxEye" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#22D3EE" />
          <stop offset="1" stopColor="#7C4DFF" />
        </linearGradient>
      </defs>

      {/* ears */}
      <path
        d="M22 14 L52 36 L30 62 Z"
        fill="url(#foxGrad)"
        opacity={mono ? 0.75 : 0.9}
      />
      <path
        d="M106 14 L76 36 L98 62 Z"
        fill="url(#foxGrad)"
        opacity={mono ? 0.75 : 0.9}
      />

      {/* head silhouette */}
      <path
        d="M64 26 C82 26 96 36 101 52 C106 68 98 88 82 102 C74 109 69 116 64 122 C59 116 54 109 46 102 C30 88 22 68 27 52 C32 36 46 26 64 26 Z"
        fill="url(#foxGrad)"
      />

      {/* inner face plane */}
      <path
        d="M64 42 C76 42 86 49 90 60 C93 71 88 85 78 95 C72 101 68 106 64 110 C60 106 56 101 50 95 C40 85 35 71 38 60 C42 49 52 42 64 42 Z"
        fill={mono ? "currentColor" : "#0B1122"}
        opacity={mono ? 0.18 : 0.92}
      />

      {/* eyes */}
      <path d="M44 66 L58 71 L47 78 Z" fill="url(#foxEye)" />
      <path d="M84 66 L70 71 L81 78 Z" fill="url(#foxEye)" />

      {/* nose */}
      <path d="M64 88 L71 96 L64 103 L57 96 Z" fill={mono ? "currentColor" : "#22D3EE"} />

      {/* whisker accents */}
      <path
        d="M30 88 L44 92 M98 88 L84 92"
        stroke={mono ? "currentColor" : "#B39CFF"}
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.55"
      />
    </svg>
  );
}

export function FoxLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <FoxMark size={compact ? 32 : 40} />
      {!compact && (
        <div className="leading-tight">
          <div className="font-display text-[15px] font-bold tracking-[0.16em] text-ink">
            FOX<span className="text-accent"> AI</span> SOCIAL
          </div>
          <div className="micro mt-0.5">MARKETING OPERATING SYSTEM</div>
        </div>
      )}
    </div>
  );
}
