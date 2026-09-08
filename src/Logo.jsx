import { useId } from "react"

// The staircase mark — "Sopan" (सोपान) is the actual Sanskrit/Hindi/Marathi
// word for a flight of steps, which is also literally what the Path tab's
// mastery progression is. Four ascending steps, a lit dot on the top one.
// Colors come from the theme tokens so it repaints correctly in light/dark.
export default function Logo({ size = 22 }) {
  const gradId = `sopan-logo-grad-${useId()}`
  return (
    <svg
      className="sopan-logo"
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="var(--accent)" />
          <stop offset="1" stopColor="var(--accent2)" />
        </linearGradient>
      </defs>
      <rect x="6" y="40" width="10" height="18" rx="3" fill={`url(#${gradId})`} />
      <rect x="20" y="30" width="10" height="28" rx="3" fill={`url(#${gradId})`} />
      <rect x="34" y="20" width="10" height="38" rx="3" fill={`url(#${gradId})`} />
      <rect x="48" y="10" width="10" height="48" rx="3" fill={`url(#${gradId})`} />
      <circle cx="53" cy="6" r="4.5" fill="var(--accent2)" />
    </svg>
  )
}
