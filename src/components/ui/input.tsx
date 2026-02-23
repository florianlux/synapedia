import { type ComponentPropsWithRef } from "react";
import { cn } from "@/lib/utils";

type InputProps = ComponentPropsWithRef<"input">;

function Input({ className, type, ref, ...props }: InputProps) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:placeholder:text-neutral-400 dark:focus-visible:ring-cyan-400",
        className
      )}
      ref={ref}
      {...props}
    />
  );
}

export { Input };
export type { InputProps };
