import { HTMLAttributes } from "react";

const variants = {
  success: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  warning: "bg-amber-50 text-amber-700 ring-amber-100",
  danger: "bg-rose-50 text-rose-700 ring-rose-100",
  neutral: "bg-slate-100 text-slate-700 ring-slate-200",
  brand: "bg-emerald-50 text-emerald-700 ring-emerald-100",
} as const;

type BadgeVariant = keyof typeof variants;

export function Badge({
  variant = "neutral",
  className = "",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
