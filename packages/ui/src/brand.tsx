export function BrandMark({ inverse = false, size = 38 }: { inverse?: boolean; size?: number }) {
  return (
    <svg
      className="brand-mark"
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M49 8v29c0 11.6-9.4 21-21 21S7 48.6 7 37"
        stroke={inverse ? '#fff' : '#2549eb'}
        strokeWidth="12"
        strokeLinecap="round"
      />
      <path d="M29 8v25a7 7 0 0 1-7 7" stroke="#ff775e" strokeWidth="12" strokeLinecap="round" />
    </svg>
  );
}
