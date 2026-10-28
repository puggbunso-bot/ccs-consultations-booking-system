export default function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="CCS logo"
    >
      <defs>
        <linearGradient id="ccsGrad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3b82f6" />
          <stop offset="1" stopColor="#1e3a8a" />
        </linearGradient>
      </defs>

      {/* tile */}
      <rect width="64" height="64" rx="15" fill="url(#ccsGrad)" />

      {/* graduation cap */}
      <path d="M32 9.5 54 19 32 28.5 10 19z" fill="#ffffff" />
      <path d="M18 22.4v7.1c0 3.1 26 3.1 26 0v-7.1L32 27.8z" fill="#dbeafe" />
      <path d="M50.5 21v10" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
      <circle cx="50.5" cy="33.5" r="2.6" fill="#fbbf24" />

      {/* calendar */}
      <rect x="17" y="35" width="30" height="21" rx="4" fill="#ffffff" />
      <path d="M17 39a4 4 0 0 1 4-4h22a4 4 0 0 1 4 4v3H17z" fill="#bfdbfe" />
      <rect x="23" y="31.5" width="3.5" height="7" rx="1.75" fill="#ffffff" />
      <rect x="37.5" y="31.5" width="3.5" height="7" rx="1.75" fill="#ffffff" />
      <g fill="#93c5fd">
        <rect x="22" y="45" width="6" height="4" rx="1" />
        <rect x="31" y="45" width="6" height="4" rx="1" />
        <rect x="40" y="45" width="4.5" height="4" rx="1" />
      </g>
    </svg>
  );
}
