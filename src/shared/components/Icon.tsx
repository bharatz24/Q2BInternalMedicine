import { memo } from "react";
import type { ReactNode } from "react";
import { BRAND } from "@/shared/constants";

// These render on every page and inside list rows / cards that re-render on
// each keystroke or price tick. Their props are primitives, so `memo` lets
// them bail out of those parent re-renders cheaply.
interface IconProps {
  d: ReactNode;
  size?: number;
  stroke?: string;
  sw?: number;
}

export const Icon = memo(({ d, size = 16, stroke = BRAND, sw = 2 }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={stroke}
    strokeWidth={sw}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ width: size, height: size, flexShrink: 0 }}
  >
    {typeof d === "string" ? <path d={d} /> : d}
  </svg>
));

export const ShieldIcon = memo(({ size = 18 }: { size?: number }) => (
  <Icon size={size} d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
));
export const CheckIcon = memo(({ size = 14 }: { size?: number }) => (
  <Icon size={size} d={<polyline points="20 6 9 17 4 12" />} />
));
export const ArrowLeft = memo(() => (
  <Icon
    size={18}
    stroke="#595959"
    d={
      <>
        <path d="M19 12H5" />
        <path d="M12 19l-7-7 7-7" />
      </>
    }
  />
));
export const LockIcon = memo(() => (
  <Icon
    size={14}
    stroke="#fff"
    d={
      <>
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </>
    }
  />
));
export const UserIcon = memo(() => (
  <Icon
    size={20}
    stroke={BRAND}
    d={
      <>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </>
    }
  />
));
export const SaveIcon = memo(() => (
  <Icon
    size={14}
    stroke={BRAND}
    d={
      <>
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
        <polyline points="17 21 17 13 7 13 7 21" />
        <polyline points="7 3 7 8 15 8" />
      </>
    }
  />
));
export const PencilIcon = memo(({ size = 14 }: { size?: number }) => (
  <Icon
    size={size}
    d={
      <>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
      </>
    }
  />
));

export const Spinner = memo(({ size = 12 }: { size?: number }) => (
  <span
    style={{
      display: "inline-block",
      width: size,
      height: size,
      border: "1.5px solid currentColor",
      borderTopColor: "transparent",
      borderRadius: "50%",
      animation: "spin 0.7s linear infinite",
      flexShrink: 0,
    }}
  />
));

export const EyeIcon = memo(({ open }: { open?: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ width: 16, height: 16, cursor: "pointer" }}
  >
    {open ? (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ) : (
      <>
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </>
    )}
  </svg>
));
