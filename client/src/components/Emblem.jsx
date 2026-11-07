export default function Emblem({ className = '' }) {
  return (
    <svg
      className={`emblem ${className}`}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7dd3fc" />
          <stop offset="1" stopColor="#0891b2" />
        </linearGradient>
      </defs>

      {/* 原子核 */}
      <circle cx="60" cy="60" r="6" fill="url(#g)" />

      {/* 轨道 1 */}
      <g transform="rotate(0 60 60)">
        <ellipse cx="60" cy="60" rx="40" ry="15" stroke="url(#g)" strokeWidth="2" />
        <circle r="4" fill="#7dd3fc">
          <animateMotion dur="3s" repeatCount="indefinite" path="M100 60 A40 15 0 1 1 20 60 A40 15 0 1 1 100 60" />
        </circle>
      </g>

      {/* 轨道 2 */}
      <g transform="rotate(60 60 60)">
        <ellipse cx="60" cy="60" rx="40" ry="15" stroke="url(#g)" strokeWidth="2" />
        <circle r="4" fill="#7dd3fc">
          <animateMotion dur="4s" repeatCount="indefinite" path="M100 60 A40 15 0 1 1 20 60 A40 15 0 1 1 100 60" />
        </circle>
      </g>

      {/* 轨道 3 */}
      <g transform="rotate(120 60 60)">
        <ellipse cx="60" cy="60" rx="40" ry="15" stroke="url(#g)" strokeWidth="2" />
        <circle r="4" fill="#7dd3fc">
          <animateMotion dur="5s" repeatCount="indefinite" path="M100 60 A40 15 0 1 1 20 60 A40 15 0 1 1 100 60" />
        </circle>
      </g>
    </svg>
  )
}
