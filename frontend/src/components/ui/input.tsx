import { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

type SharedProps = {
  label?: string;
  error?: string;
  hint?: string;
  wrapperClassName?: string;
};

export function Input({
  label,
  error,
  hint,
  wrapperClassName = "",
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & SharedProps) {
  return (
    <label className={`block space-y-1.5 ${wrapperClassName}`}>
      {label ? <span className="text-sm font-medium text-slate-700">{label}</span> : null}
      <input
        className={`w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 ${className}`}
        {...props}
      />
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      {!error && hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
    </label>
  );
}

export function Textarea({
  label,
  error,
  hint,
  wrapperClassName = "",
  className = "",
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & SharedProps) {
  return (
    <label className={`block space-y-1.5 ${wrapperClassName}`}>
      {label ? <span className="text-sm font-medium text-slate-700">{label}</span> : null}
      <textarea
        className={`min-h-[160px] w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 ${className}`}
        {...props}
      />
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      {!error && hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
    </label>
  );
}
