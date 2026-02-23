import { type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type NativeSelectProps = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "onChange"
> & {
  onValueChange?: (value: string) => void;
  ref?: React.Ref<HTMLSelectElement>;
};

function NativeSelect({
  className,
  onValueChange,
  children,
  ref,
  ...props
}: NativeSelectProps) {
  return (
    <select
      ref={ref}
      className={cn(
        "flex h-10 w-full appearance-none rounded-md border border-neutral-300 bg-transparent px-3 py-2 pr-8 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700",
        "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23999%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1rem] bg-[position:right_0.5rem_center] bg-no-repeat",
        className
      )}
      onChange={(e) => onValueChange?.(e.target.value)}
      {...props}
    >
      {children}
    </select>
  );
}

export { NativeSelect };
export type { NativeSelectProps };
