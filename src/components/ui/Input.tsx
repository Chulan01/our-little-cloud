import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn("min-h-11 w-full rounded-2xl border border-white/80 bg-white/70 px-4 text-ink outline-none transition placeholder:text-ink/40 focus:border-petal focus:ring-2 focus:ring-glow", className)}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn("min-h-32 w-full rounded-2xl border border-white/80 bg-white/70 px-4 py-3 text-ink outline-none transition placeholder:text-ink/40 focus:border-petal focus:ring-2 focus:ring-glow", className)}
      {...props}
    />
  );
}

export function DatePicker(props: InputHTMLAttributes<HTMLInputElement>) {
  return <Input type="date" {...props} />;
}
