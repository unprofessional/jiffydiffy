import * as React from "react";

type IconProps = React.SVGProps<SVGSVGElement> & { size?: number };

/** ▶️ Play */
export function PlayIcon({ size = 18, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden
      {...props}
    >
      <path d="M8 5v14l11-7-11-7z" />
    </svg>
  );
}

/** 🔄 Refresh / Rotate-CCW */
export function RefreshIcon({ size = 18, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden
      {...props}
    >
      <path d="M17.65 6.35A7.95 7.95 0 0012 4a8 8 0 108 8h-2a6 6 0 11-6-6c1.66 0 3.14.67 4.22 1.76L14 10h8V2l-4.35 4.35z" />
    </svg>
  );
}
